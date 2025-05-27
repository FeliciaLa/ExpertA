from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import User
import jwt
from django.conf import settings

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Convert UUID to string representation in the token
        token['user_id'] = str(user.id)
        
        # Add custom claims
        token['email'] = user.email
        token['name'] = user.name
        token['role'] = user.role
        
        # For backward compatibility
        token['is_expert'] = user.is_expert_user()
        token['is_user'] = user.is_regular_user()
            
        return token

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        # Extract token
        refresh = attrs['refresh']
        
        try:
            # Get the secret key from settings
            secret_key = settings.SECRET_KEY
            
            # First just decode headers to check if token is valid before fully decoding
            jwt_headers = jwt.get_unverified_header(refresh)
            if not jwt_headers or not isinstance(jwt_headers, dict):
                raise InvalidToken('Invalid token format')
            
            # Now decode the full token with verification
            decoded_token = jwt.decode(refresh, secret_key, algorithms=["HS256"], options={"verify_signature": True})
            
            # Get user_id from token claims
            user_id = decoded_token.get('user_id')
            
            print(f"Refresh token payload: user_id={user_id}, role={decoded_token.get('role', 'unknown')}")
            
            # Find user in the unified User model
            try:
                user = User.objects.get(id=user_id)
                print(f"Found User with ID {user_id}, role: {user.role}")
            except User.DoesNotExist:
                print(f"User with ID {user_id} not found")
                raise InvalidToken('User not found')
            
            # Generate new tokens
            refresh = RefreshToken.for_user(user)
            
            # Add claims to the token
            refresh['user_id'] = str(user.id)
            refresh['email'] = user.email
            refresh['name'] = user.name
            refresh['role'] = user.role
            
            # For backward compatibility
            refresh['is_expert'] = user.is_expert_user()
            refresh['is_user'] = user.is_regular_user()
            
            return {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
            
        except (jwt.DecodeError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
            print(f"Token decode error: {str(e)}")
            raise InvalidToken(f'Token decode error: {str(e)}')
        except Exception as e:
            print(f"Refresh token error: {str(e)}")
            raise InvalidToken(f'Error processing token: {str(e)}')

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer 