import re

path = '/etc/nginx/sites-available/smartprint'
with open(path, 'r') as f:
    text = f.read()

# Replace any malformed location = /index.html block
pattern = r'location = /index\.html \{[\s\S]*?\}'
fixed_block = '''location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        expires off;
    }'''

if re.search(pattern, text):
    text = re.sub(pattern, fixed_block, text)
else:
    text = text.replace('location / {', fixed_block + '\n\n    location / {')

with open(path, 'w') as f:
    f.write(text)

print('Updated nginx configuration successfully.')
