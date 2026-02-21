import { db } from '../../lib/db/index.js';
import { TRANSLATIONS } from '../../lib/db/schema.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function seedTranslations() {
  console.log('  📝 Seeding translations...');
  
  try {
    // Define the path to translation files
    const translationsPath = join(__dirname, '../../../client/src/i18n/locales');
    
    // Load existing translation files
    const enTranslations = JSON.parse(readFileSync(join(translationsPath, 'en.json'), 'utf-8'));
    const esTranslations = JSON.parse(readFileSync(join(translationsPath, 'es.json'), 'utf-8'));
    const frTranslations = JSON.parse(readFileSync(join(translationsPath, 'fr.json'), 'utf-8'));
    const deTranslations = JSON.parse(readFileSync(join(translationsPath, 'de.json'), 'utf-8'));
    
    // Add statusDescriptions to each language
    enTranslations.tasks.statusDescriptions = {
      TO_DO: 'Tasks that are planned but not yet started',
      IN_PROGRESS: 'Tasks currently being worked on',
      IN_REVIEW: 'Tasks awaiting code review or approval',
      DONE: 'Completed tasks',
      TESTING: 'Tasks in testing phase',
      AWAITING_APPROVAL: 'Tasks waiting for stakeholder approval',
      READY_FOR_DEPLOY: 'Tasks ready to be deployed to production',
      ICEBOX: 'Tasks that are deprioritized or on hold',
      READY: 'Tasks that are ready to be started',
      BACKLOG: 'Tasks in the backlog awaiting prioritization',
      TESTING_DEV: 'Tasks being tested in development environment',
      TESTING_STAGE: 'Tasks being tested in staging environment',
      PLANNING: 'Tasks in planning phase'
    };
    
    // Ensure statuses object exists
    if (!enTranslations.tasks.statuses) enTranslations.tasks.statuses = {};
    
    // Add new statuses to existing status labels
    enTranslations.tasks.statuses.PENDING = 'Pending';
    enTranslations.tasks.statuses.TO_DO = 'To Do';
    enTranslations.tasks.statuses.IN_PROGRESS = 'In Progress';
    enTranslations.tasks.statuses.IN_REVIEW = 'In Review';
    enTranslations.tasks.statuses.DONE = 'Done';
    enTranslations.tasks.statuses.TESTING = 'Testing';
    enTranslations.tasks.statuses.AWAITING_APPROVAL = 'Awaiting Approval';
    enTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Ready for Deploy';
    enTranslations.tasks.statuses.ICEBOX = 'Icebox';
    enTranslations.tasks.statuses.READY = 'Ready To Start';
    enTranslations.tasks.statuses.BACKLOG = 'Backlog';
    enTranslations.tasks.statuses.TESTING_DEV = 'Testing (Dev)';
    enTranslations.tasks.statuses.TESTING_STAGE = 'Testing (Stage)';
    enTranslations.tasks.statuses.PLANNING = 'Planning';
    enTranslations.tasks.statuses.QA = 'QA';
    enTranslations.tasks.statuses.COMPLETED = 'Completed';
    enTranslations.deliverables = enTranslations.deliverables || {};
    
    esTranslations.tasks.statusDescriptions = {
      TO_DO: 'Tareas planificadas pero no iniciadas',
      IN_PROGRESS: 'Tareas en las que se está trabajando actualmente',
      IN_REVIEW: 'Tareas en espera de revisión de código o aprobación',
      DONE: 'Tareas completadas',
      TESTING: 'Tareas en fase de pruebas',
      AWAITING_APPROVAL: 'Tareas en espera de aprobación de interesados',
      READY_FOR_DEPLOY: 'Tareas listas para desplegarse en producción',
      ICEBOX: 'Tareas despriorizadas o en espera',
      READY: 'Tareas listas para comenzar',
      BACKLOG: 'Tareas en backlog esperando priorización',
      TESTING_DEV: 'Tareas siendo probadas en entorno de desarrollo',
      TESTING_STAGE: 'Tareas siendo probadas en entorno de staging',
      PLANNING: 'Tareas en fase de planificación'
    };
    
    // Ensure statuses object exists
    if (!esTranslations.tasks.statuses) esTranslations.tasks.statuses = {};
    
    // Add all statuses
    esTranslations.tasks.statuses.PENDING = 'Pendiente';
    esTranslations.tasks.statuses.TO_DO = 'Por Hacer';
    esTranslations.tasks.statuses.IN_PROGRESS = 'En Progreso';
    esTranslations.tasks.statuses.IN_REVIEW = 'En Revisión';
    esTranslations.tasks.statuses.DONE = 'Completado';
    esTranslations.tasks.statuses.TESTING = 'Pruebas';
    esTranslations.tasks.statuses.AWAITING_APPROVAL = 'En Espera de Aprobación';
    esTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Listo para Desplegar';
    esTranslations.tasks.statuses.ICEBOX = 'Congelador';
    esTranslations.tasks.statuses.READY = 'Listo Para Comenzar';
    esTranslations.tasks.statuses.BACKLOG = 'Backlog';
    esTranslations.tasks.statuses.TESTING_DEV = 'Pruebas (Dev)';
    esTranslations.tasks.statuses.TESTING_STAGE = 'Pruebas (Stage)';
    esTranslations.tasks.statuses.PLANNING = 'Planificación';
    esTranslations.tasks.statuses.QA = 'QA';
    esTranslations.tasks.statuses.COMPLETED = 'Completado';
    esTranslations.deliverables = esTranslations.deliverables || {};
    
    frTranslations.tasks.statusDescriptions = {
      TO_DO: 'Tâches planifiées mais pas encore commencées',
      IN_PROGRESS: 'Tâches en cours de traitement',
      IN_REVIEW: 'Tâches en attente de révision de code ou d\'approbation',
      DONE: 'Tâches terminées',
      TESTING: 'Tâches en phase de test',
      AWAITING_APPROVAL: 'Tâches en attente d\'approbation des parties prenantes',
      READY_FOR_DEPLOY: 'Tâches prêtes à être déployées en production',
      ICEBOX: 'Tâches déprioritarisées ou en attente',
      READY: 'Tâches prêtes à être commencées',
      BACKLOG: 'Tâches dans le backlog en attente de priorisation',
      TESTING_DEV: 'Tâches testées dans l\'environnement de développement',
      TESTING_STAGE: 'Tâches testées dans l\'environnement de staging',
      PLANNING: 'Tâches en phase de planification'
    };
    
    // Ensure statuses object exists
    if (!frTranslations.tasks.statuses) frTranslations.tasks.statuses = {};
    
    // Add all statuses
    frTranslations.tasks.statuses.PENDING = 'En attente';
    frTranslations.tasks.statuses.TO_DO = 'À Faire';
    frTranslations.tasks.statuses.IN_PROGRESS = 'En Cours';
    frTranslations.tasks.statuses.IN_REVIEW = 'En Révision';
    frTranslations.tasks.statuses.DONE = 'Terminé';
    frTranslations.tasks.statuses.TESTING = 'Tests';
    frTranslations.tasks.statuses.AWAITING_APPROVAL = 'En Attente d\'Approbation';
    frTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Prêt pour le Déploiement';
    frTranslations.tasks.statuses.ICEBOX = 'Frigo';
    frTranslations.tasks.statuses.READY = 'Prêt à Commencer';
    frTranslations.tasks.statuses.BACKLOG = 'Backlog';
    frTranslations.tasks.statuses.TESTING_DEV = 'Tests (Dev)';
    frTranslations.tasks.statuses.TESTING_STAGE = 'Tests (Stage)';
    frTranslations.tasks.statuses.PLANNING = 'Planification';
    frTranslations.tasks.statuses.QA = 'QA';
    frTranslations.tasks.statuses.COMPLETED = 'Terminé';
    frTranslations.deliverables = frTranslations.deliverables || {};
    
    deTranslations.tasks.statusDescriptions = {
      TO_DO: 'Geplante, aber noch nicht begonnene Aufgaben',
      IN_PROGRESS: 'Aufgaben, an denen derzeit gearbeitet wird',
      IN_REVIEW: 'Aufgaben, die auf Code-Review oder Genehmigung warten',
      DONE: 'Abgeschlossene Aufgaben',
      TESTING: 'Aufgaben in der Testphase',
      AWAITING_APPROVAL: 'Aufgaben, die auf Stakeholder-Genehmigung warten',
      READY_FOR_DEPLOY: 'Aufgaben, die bereit für die Produktionsbereitstellung sind',
      ICEBOX: 'Zurückgestellte oder pausierte Aufgaben',
      READY: 'Aufgaben, die bereit sind zu starten',
      BACKLOG: 'Aufgaben im Backlog, die auf Priorisierung warten',
      TESTING_DEV: 'Aufgaben, die in der Entwicklungsumgebung getestet werden',
      TESTING_STAGE: 'Aufgaben, die in der Staging-Umgebung getestet werden',
      PLANNING: 'Aufgaben in der Planungsphase'
    };
    
    // Ensure statuses object exists
    if (!deTranslations.tasks.statuses) deTranslations.tasks.statuses = {};
    
    // Add all statuses
    deTranslations.tasks.statuses.PENDING = 'Ausstehend';
    deTranslations.tasks.statuses.TO_DO = 'Zu Erledigen';
    deTranslations.tasks.statuses.IN_PROGRESS = 'In Bearbeitung';
    deTranslations.tasks.statuses.IN_REVIEW = 'In Überprüfung';
    deTranslations.tasks.statuses.DONE = 'Erledigt';
    deTranslations.tasks.statuses.TESTING = 'Testen';
    deTranslations.tasks.statuses.AWAITING_APPROVAL = 'Wartet auf Genehmigung';
    deTranslations.tasks.statuses.READY_FOR_DEPLOY = 'Bereit für Bereitstellung';
    deTranslations.tasks.statuses.ICEBOX = 'Eiskiste';
    deTranslations.tasks.statuses.READY = 'Bereit zu Starten';
    deTranslations.tasks.statuses.BACKLOG = 'Backlog';
    deTranslations.tasks.statuses.TESTING_DEV = 'Testen (Dev)';
    deTranslations.tasks.statuses.TESTING_STAGE = 'Testen (Stage)';
    deTranslations.tasks.statuses.PLANNING = 'Planung';
    deTranslations.tasks.statuses.QA = 'QA';
    deTranslations.tasks.statuses.COMPLETED = 'Abgeschlossen';
    deTranslations.deliverables = deTranslations.deliverables || {};

    enTranslations.deliverables = {
      ...(enTranslations.deliverables || {}),
      title: 'Deliverables',
      statuses: { PLANNING: 'Planning', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', UAT: 'UAT', STAGED: 'Staged', PROD: 'Prod', DONE: 'Done' }
    };
    esTranslations.deliverables = {
      ...(esTranslations.deliverables || {}),
      title: 'Entregables',
      statuses: { PLANNING: 'Planificación', IN_PROGRESS: 'En Progreso', IN_REVIEW: 'En Revisión', UAT: 'UAT', STAGED: 'Staged', PROD: 'Prod', DONE: 'Hecho' }
    };
    frTranslations.deliverables = {
      ...(frTranslations.deliverables || {}),
      title: 'Livrables',
      statuses: { PLANNING: 'Planification', IN_PROGRESS: 'En cours', IN_REVIEW: 'En revue', UAT: 'UAT', STAGED: 'Staged', PROD: 'Prod', DONE: 'Terminé' }
    };
    deTranslations.deliverables = {
      ...(deTranslations.deliverables || {}),
      title: 'Lieferobjekte',
      statuses: { PLANNING: 'Planung', IN_PROGRESS: 'In Bearbeitung', IN_REVIEW: 'In Prüfung', UAT: 'UAT', STAGED: 'Staged', PROD: 'Prod', DONE: 'Erledigt' }
    };
    
    // Insert translations into database
    await db.insert(TRANSLATIONS).values([
      {
        language_code: 'en',
        translations: JSON.stringify(enTranslations)
      },
      {
        language_code: 'es',
        translations: JSON.stringify(esTranslations)
      },
      {
        language_code: 'fr',
        translations: JSON.stringify(frTranslations)
      },
      {
        language_code: 'de',
        translations: JSON.stringify(deTranslations)
      }
    ]);
    
    console.log('  ✅ Translations seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding translations:', error.message);
    throw error;
  }
}
