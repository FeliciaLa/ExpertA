#!/usr/bin/env python3

# Quick fix for views.py indentation
def fix_views_indentation():
    with open('backend/api/views.py', 'r') as f:
        content = f.read()
    
    # Replace the problematic section with correct indentation
    old_section = '''        session = ConsultationSession.objects.create(
            user=request.user,
                expert=expert,
                expert_name=expert.name,
                expert_industry="ACTIVATION",  # Special marker for activation payments
                expert_specialty=f"ACTIVATION_PAYMENT_{payment_intent_id}",  # Store payment ID
                status=ConsultationSession.Status.ACTIVE,
                total_messages=0,  # Track usage against 200 limit
            )
            
        payment_amount = float(payment_data.get('amount', 0)) / 100  # Convert from pence to pounds
        print(f"✅ Expert activated: {expert.name} with payment £{payment_amount}")
        
        return Response({
                'success': True,
                'expert_activated': True,
                'expert_name': expert.name,
                'amount_paid': payment_amount,
                'interaction_limit': 200,
                'session_id': str(session.id)
            })'''
    
    new_section = '''            session = ConsultationSession.objects.create(
                user=request.user,
                expert=expert,
                expert_name=expert.name,
                expert_industry="ACTIVATION",  # Special marker for activation payments
                expert_specialty=f"ACTIVATION_PAYMENT_{payment_intent_id}",  # Store payment ID
                status=ConsultationSession.Status.ACTIVE,
                total_messages=0,  # Track usage against 200 limit
            )
            
            payment_amount = float(payment_data.get('amount', 0)) / 100  # Convert from pence to pounds
            print(f"✅ Expert activated: {expert.name} with payment £{payment_amount}")
            
            return Response({
                'success': True,
                'expert_activated': True,
                'expert_name': expert.name,
                'amount_paid': payment_amount,
                'interaction_limit': 200,
                'session_id': str(session.id)
            })'''
    
    content = content.replace(old_section, new_section)
    
    with open('backend/api/views.py', 'w') as f:
        f.write(content)
    
    print("Fixed indentation in views.py")

if __name__ == "__main__":
    fix_views_indentation() 