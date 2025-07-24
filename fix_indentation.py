#!/usr/bin/env python3

# Read the views.py file
with open('backend/api/views.py', 'r') as f:
    lines = f.readlines()

# Fix the indentation issue starting from line 3095 (0-indexed = 3094)
fixed_lines = []
in_consultation_block = False

for i, line in enumerate(lines):
    line_num = i + 1
    
    # Detect the start of the problematic section
    if line_num == 3095 and line.strip().startswith('# Get expert and pricing info'):
        # Start indenting this section properly
        in_consultation_block = True
        fixed_lines.append('            ' + line.strip() + '\n')
        continue
    
    # Continue indenting until we reach the next major block
    if in_consultation_block and line_num < 3125:
        if line.strip():  # Don't indent empty lines
            if not line.startswith('            '):  # If not already properly indented
                fixed_lines.append('            ' + line.strip() + '\n')
            else:
                fixed_lines.append(line)
        else:
            fixed_lines.append(line)
        continue
    
    # Stop indenting at the next major block
    if line_num >= 3125:
        in_consultation_block = False
    
    # Keep all other lines as-is
    fixed_lines.append(line)

# Write the fixed file
with open('backend/api/views.py', 'w') as f:
    f.writelines(fixed_lines)

print("✅ Fixed indentation issue in views.py") 