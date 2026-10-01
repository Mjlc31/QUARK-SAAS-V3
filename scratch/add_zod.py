import re

with open('backend/server.js', 'r') as f:
    content = f.read()

# Add zod import
if 'import { z } from "zod";' not in content:
    content = content.replace("import helmet from 'helmet';", "import helmet from 'helmet';\nimport { z } from 'zod';")

# Replace chat route
chat_route = """app.post('/api/chat', async (req, res) => {
  try {
    const schema = z.object({ message: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Mensagem inválida', details: parsed.error });
    const { message } = parsed.data;"""

content = re.sub(
    r"app\.post\('/api/chat', async \(req, res\) => \{\n  try \{\n    const \{ message \} = req\.body;",
    chat_route,
    content
)

# Replace evolution route
evo_route = """app.post('/api/evolution/connect', async (req, res) => {
  try {
    const schema = z.object({ instanceName: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error });
    const { instanceName } = parsed.data;"""

content = re.sub(
    r"app\.post\('/api/evolution/connect', async \(req, res\) => \{\n  try \{\n    const \{ instanceName \} = req\.body;",
    evo_route,
    content
)

# Replace tickets route
ticket_route = """app.post('/api/tickets', async (req, res) => {
  try {
    const schema = z.object({
      subject: z.string().min(3),
      description: z.string().optional(),
      category: z.string().optional(),
      priority: z.string().optional(),
      client_id: z.string()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error });
    const { subject, description, category, priority, client_id } = parsed.data;"""

content = re.sub(
    r"app\.post\('/api/tickets', async \(req, res\) => \{\n  try \{\n    const \{ subject, description, category, priority, client_id \} = req\.body;\n    if \(!subject\) return res\.status\(400\)\.json\(\{ error: 'Subject is required' \}\);",
    ticket_route,
    content
)


with open('backend/server.js', 'w') as f:
    f.write(content)

