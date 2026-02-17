/**
 * Expected translation structures for testing
 * These should match the seeded translation data
 */

export const expectedEnglishTranslations = {
  tasks: {
    statuses: {
      TO_DO: 'To Do',
      READY: 'Ready To Start',
      IN_PROGRESS: 'In Progress',
      QA: 'QA',
      COMPLETED: 'Completed'
    }
  }
};

export const expectedSpanishTranslations = {
  tasks: {
    statuses: {
      TO_DO: 'Por Hacer',
      READY: 'Listo Para Comenzar',
      IN_PROGRESS: 'En Progreso',
      QA: 'QA',
      COMPLETED: 'Completado'
    }
  }
};

export const expectedFrenchTranslations = {
  tasks: {
    statuses: {}
  }
};

export const expectedGermanTranslations = {
  tasks: {
    statuses: {}
  }
};

export const expectedTranslationStructure = {
  type: 'object',
  required: ['translations'],
  properties: {
    translations: {
      type: 'object'
    }
  }
};
