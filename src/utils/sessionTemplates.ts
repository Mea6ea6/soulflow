export type SessionTemplateId = 'blank' | 'soap' | 'dap' | 'birp';

export interface SessionTemplateOption {
  id: SessionTemplateId;
  labelKey: string;
  descriptionKey: string;
}

export const SESSION_TEMPLATE_OPTIONS: SessionTemplateOption[] = [
  { id: 'blank', labelKey: 'documentTarget.templateBlank', descriptionKey: 'documentTarget.templateBlankDescription' },
  { id: 'soap', labelKey: 'documentTarget.templateSoap', descriptionKey: 'documentTarget.templateSoapDescription' },
  { id: 'dap', labelKey: 'documentTarget.templateDap', descriptionKey: 'documentTarget.templateDapDescription' },
  { id: 'birp', labelKey: 'documentTarget.templateBirp', descriptionKey: 'documentTarget.templateBirpDescription' },
];

function heading(level: 1 | 2 | 3, text: string) {
  return { type: 'heading', attrs: { level }, content: text ? [{ type: 'text', text }] : [] };
}

// Курсивная подсказка-затравка — обычный редактируемый текст, не защищённый
// плейсхолдер: пользователь может стереть или переписать её как угодно.
// Задача — не диктовать формулировки, а просто не оставлять раздел совсем
// пустым, чтобы было понятнее, что туда писать
function hint(text: string) {
  return { type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'italic' }] }] };
}

function paragraph() {
  return { type: 'paragraph' };
}

interface TranslateFn {
  (key: string): string;
}

export function buildTemplateContent(templateId: SessionTemplateId | undefined, t: TranslateFn): object | null {
  if (!templateId || templateId === 'blank') return null;

  if (templateId === 'soap') {
    return {
      type: 'doc',
      content: [
        heading(2, t('textEditor.soapSubjective')), hint(t('textEditor.soapSubjectiveHint')), paragraph(),
        heading(2, t('textEditor.soapObjective')), hint(t('textEditor.soapObjectiveHint')), paragraph(),
        heading(2, t('textEditor.soapAssessment')), hint(t('textEditor.soapAssessmentHint')), paragraph(),
        heading(2, t('textEditor.soapPlan')), hint(t('textEditor.soapPlanHint')), paragraph(),
      ],
    };
  }

  if (templateId === 'dap') {
    return {
      type: 'doc',
      content: [
        heading(2, t('textEditor.dapData')), hint(t('textEditor.dapDataHint')), paragraph(),
        heading(2, t('textEditor.dapAssessment')), hint(t('textEditor.dapAssessmentHint')), paragraph(),
        heading(2, t('textEditor.dapPlan')), hint(t('textEditor.dapPlanHint')), paragraph(),
      ],
    };
  }

  if (templateId === 'birp') {
    return {
      type: 'doc',
      content: [
        heading(2, t('textEditor.birpBehavior')), hint(t('textEditor.birpBehaviorHint')), paragraph(),
        heading(2, t('textEditor.birpIntervention')), hint(t('textEditor.birpInterventionHint')), paragraph(),
        heading(2, t('textEditor.birpResponse')), hint(t('textEditor.birpResponseHint')), paragraph(),
        heading(2, t('textEditor.birpPlan')), hint(t('textEditor.birpPlanHint')), paragraph(),
      ],
    };
  }

  return null;
}