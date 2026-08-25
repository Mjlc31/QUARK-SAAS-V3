import os
import re

src_dir = 'src'

# Match <button ... className="..."
# We want to add "min-w-[44px] min-h-[44px] flex items-center justify-center"
# only to buttons that don't have min-w, min-h, p-3, p-4

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False
    
    # We will find all <button ... className="... ">
    # and replace the className value
    def repl(match):
        nonlocal changed
        prefix = match.group(1)
        quote = match.group(2)
        classes = match.group(3)
        
        if 'min-w-' not in classes and 'min-h-' not in classes and 'p-3' not in classes and 'p-4' not in classes:
            changed = True
            new_classes = classes + " min-w-[44px] min-h-[44px]"
            # add flex items-center justify-center if not present
            if 'flex' not in classes:
                new_classes += " flex items-center justify-center"
            return f'<button{prefix}className={quote}{new_classes}{quote}'
        return match.group(0)

    # regex to match button className
    new_content = re.sub(r'<button([^>]*)className=(["\'])(.*?)\2', repl, content)

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.jsx'):
            process_file(os.path.join(root, file))
