import os
import re

files = [
    'src/pages/Maintenance.tsx',
    'src/pages/TicketAdmin.tsx',
    'src/pages/Ecommerce.tsx',
    'src/pages/Financial.tsx'
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'SkeletonPage' not in content:
        # 1. Add import
        last_import_idx = content.rfind('import ')
        if last_import_idx != -1:
            end_of_line = content.find('\n', last_import_idx)
            content = content[:end_of_line+1] + "import { SkeletonPage } from '../components/SkeletonLoader';\n" + content[end_of_line+1:]
        
        # 2. Add loading state condition if there is a loading variable
        # Find something like: isLoading: loading = false or loading
        # Simple regex: find the main return and insert it before
        # We need to make sure we don't insert it inside a map function or subcomponent
        # The main return is usually the first "return (" that has low indentation, but easier:
        # search for `return (` after `const [`, or `const {`
        
        # A safer bet: find the first `return (` that is indented with 2 spaces
        match = re.search(r'\n  return \(', content)
        if match:
            # We assume the hook provides a variable named 'loading' or 'isLoading'
            # Let's check if 'loading' or 'isLoading' is in the file
            if re.search(r'\b(loading|isLoading)\b', content[:match.start()]):
                load_var = 'loading' if 'loading' in content[:match.start()] else 'isLoading'
                # If neither is defined properly, we just use a generic check if we can, but let's see what variables exist.
                # Actually, some might not extract isLoading.
                # Let's just do it manually for safety.
                pass

print("Script completed.")
