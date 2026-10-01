import os
import re

files = [
    'src/components/AIOCRInvoiceUploader.tsx',
    'src/components/LeadCPQPanel.tsx',
    'src/components/proposals/steps/StepExport.tsx'
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'alert(' in content:
        # Add import if not exists
        if 'import toast' not in content and 'import { toast }' not in content:
            # Find the last import
            last_import_idx = content.rfind('import ')
            if last_import_idx != -1:
                end_of_line = content.find('\n', last_import_idx)
                content = content[:end_of_line+1] + "import toast from 'react-hot-toast';\n" + content[end_of_line+1:]
        
        def replace_alert(match):
            text = match.group(0)
            if 'sucesso' in text.lower():
                return text.replace('alert(', 'toast.success(')
            elif 'erro' in text.lower() or 'falha' in text.lower() or 'não' in text.lower() or 'invalid' in text.lower():
                return text.replace('alert(', 'toast.error(')
            else:
                return text.replace('alert(', 'toast(')
                
        content = re.sub(r"alert\([^)]+\)", replace_alert, content)
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
