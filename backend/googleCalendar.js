import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Define escopos necessários
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// Caminho para o arquivo da Conta de Serviço (Service Account)
const KEYFILE_PATH = path.join(process.cwd(), 'service_account.json');

export async function insertTaskIntoCalendar(taskData) {
  try {
    if (!fs.existsSync(KEYFILE_PATH)) {
      console.warn('[GOOGLE CALENDAR] Arquivo service_account.json não encontrado. Ignorando sincronização de calendário.');
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILE_PATH,
      scopes: SCOPES,
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Determina o calendário com base no responsável
    // "Arthur" -> arthurmoraesp12@gmail.com
    // "Anderson" -> ctt.andersonalves@gmail.com
    // Fallback: contato.quarkenergia@gmail.com
    
    let calendarId = 'contato.quarkenergia@gmail.com'; // Default
    if (taskData.assignee === 'Arthur') calendarId = 'arthurmoraesp12@gmail.com';
    if (taskData.assignee === 'Anderson') calendarId = 'ctt.andersonalves@gmail.com';

    // Formata datas
    // Se a deadline for fornecida, usamos ela. Caso contrário, criamos para amanhã.
    const startDate = taskData.deadline ? new Date(taskData.deadline) : new Date(Date.now() + 86400000);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora

    const event = {
      summary: `[Quark OS] ${taskData.title}`,
      description: `Tarefa designada para: ${taskData.assignee}\nPrioridade: ${taskData.priority}\nGerado automaticamente pelo Quark SaaS.`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      colorId: taskData.priority === 'High' ? '11' : (taskData.priority === 'Medium' ? '5' : '10'), // 11=Red, 5=Yellow, 10=Green
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });

    console.log(`[GOOGLE CALENDAR] Evento criado: ${response.data.htmlLink}`);
    return true;
  } catch (error) {
    console.error('[GOOGLE CALENDAR ERROR]:', error.message);
    return false;
  }
}
