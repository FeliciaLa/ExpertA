#!/usr/bin/env python3

# Fix the specific indentation issue in views.py
with open('backend/api/views.py', 'r') as f:
    content = f.read()

# Fix the specific indentation problem
old_text = """                if 'client_secret' in intent_data:
        return Response({
                        'client_secret': intent_data['client_secret'],
                        'payment_intent_id': intent_data['id'],
            'amount': total_amount,
            'expert_amount': expert_amount,
            'platform_amount': platform_amount
        })"""

new_text = """                if 'client_secret' in intent_data:
                    return Response({
                        'client_secret': intent_data['client_secret'],
                        'payment_intent_id': intent_data['id'],
                        'amount': total_amount,
                        'expert_amount': expert_amount,
                        'platform_amount': platform_amount
                    })"""

# Replace the problematic section
if old_text in content:
    content = content.replace(old_text, new_text)
    print("✅ Fixed return Response indentation")
else:
    print("❌ Could not find the problematic section")

# Write the fixed file
with open('backend/api/views.py', 'w') as f:
    f.write(content)

print("✅ Indentation fix applied") 