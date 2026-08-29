export type SessionTemplateId = 'blank' | 'soap' | 'dap' | 'birp' | 'girp' | 'pirp';

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
  { id: 'girp', labelKey: 'documentTarget.templateGirp', descriptionKey: 'documentTarget.templateGirpDescription' },
  { id: 'pirp', labelKey: 'documentTarget.templatePirp', descriptionKey: 'documentTarget.templatePirpDescription' },
];

interface TranslateFn {
  (key: string): string;
}

interface TemplateSection {
  headingKey: string;
  promptKeys: [string, string, string];
}

function heading(level: 1 | 2 | 3, text: string) {
  return { type: 'heading', attrs: { level }, content: text ? [{ type: 'text', text }] : [] };
}

function hint(text: string) {
  return { type: 'paragraph', content: [{ type: 'text', text, marks: [{ type: 'italic' }] }] };
}

function paragraph() {
  return { type: 'paragraph' };
}

function buildSection(t: TranslateFn, section: TemplateSection): object[] {
  return [
    heading(2, t(section.headingKey)),
    {
      type: 'bulletList',
      content: section.promptKeys.map((promptKey) => ({
        type: 'listItem',
        content: [hint(t(promptKey)), paragraph()],
      })),
    },
    paragraph(),
  ];
}

const SOAP_SECTIONS: TemplateSection[] = [
  { headingKey: 'textEditor.soapSubjective', promptKeys: ['textEditor.soapSubjectivePrompt1', 'textEditor.soapSubjectivePrompt2', 'textEditor.soapSubjectivePrompt3'] },
  { headingKey: 'textEditor.soapObjective', promptKeys: ['textEditor.soapObjectivePrompt1', 'textEditor.soapObjectivePrompt2', 'textEditor.soapObjectivePrompt3'] },
  { headingKey: 'textEditor.soapAssessment', promptKeys: ['textEditor.soapAssessmentPrompt1', 'textEditor.soapAssessmentPrompt2', 'textEditor.soapAssessmentPrompt3'] },
  { headingKey: 'textEditor.soapPlan', promptKeys: ['textEditor.soapPlanPrompt1', 'textEditor.soapPlanPrompt2', 'textEditor.soapPlanPrompt3'] },
];

const DAP_SECTIONS: TemplateSection[] = [
  { headingKey: 'textEditor.dapData', promptKeys: ['textEditor.dapDataPrompt1', 'textEditor.dapDataPrompt2', 'textEditor.dapDataPrompt3'] },
  { headingKey: 'textEditor.dapAssessment', promptKeys: ['textEditor.dapAssessmentPrompt1', 'textEditor.dapAssessmentPrompt2', 'textEditor.dapAssessmentPrompt3'] },
  { headingKey: 'textEditor.dapPlan', promptKeys: ['textEditor.dapPlanPrompt1', 'textEditor.dapPlanPrompt2', 'textEditor.dapPlanPrompt3'] },
];

const BIRP_SECTIONS: TemplateSection[] = [
  { headingKey: 'textEditor.birpBehavior', promptKeys: ['textEditor.birpBehaviorPrompt1', 'textEditor.birpBehaviorPrompt2', 'textEditor.birpBehaviorPrompt3'] },
  { headingKey: 'textEditor.birpIntervention', promptKeys: ['textEditor.birpInterventionPrompt1', 'textEditor.birpInterventionPrompt2', 'textEditor.birpInterventionPrompt3'] },
  { headingKey: 'textEditor.birpResponse', promptKeys: ['textEditor.birpResponsePrompt1', 'textEditor.birpResponsePrompt2', 'textEditor.birpResponsePrompt3'] },
  { headingKey: 'textEditor.birpPlan', promptKeys: ['textEditor.birpPlanPrompt1', 'textEditor.birpPlanPrompt2', 'textEditor.birpPlanPrompt3'] },
];

const GIRP_SECTIONS: TemplateSection[] = [
  { headingKey: 'textEditor.girpGoal', promptKeys: ['textEditor.girpGoalPrompt1', 'textEditor.girpGoalPrompt2', 'textEditor.girpGoalPrompt3'] },
  { headingKey: 'textEditor.girpIntervention', promptKeys: ['textEditor.girpInterventionPrompt1', 'textEditor.girpInterventionPrompt2', 'textEditor.girpInterventionPrompt3'] },
  { headingKey: 'textEditor.girpResponse', promptKeys: ['textEditor.girpResponsePrompt1', 'textEditor.girpResponsePrompt2', 'textEditor.girpResponsePrompt3'] },
  { headingKey: 'textEditor.girpPlan', promptKeys: ['textEditor.girpPlanPrompt1', 'textEditor.girpPlanPrompt2', 'textEditor.girpPlanPrompt3'] },
];

const PIRP_SECTIONS: TemplateSection[] = [
  { headingKey: 'textEditor.pirpProblem', promptKeys: ['textEditor.pirpProblemPrompt1', 'textEditor.pirpProblemPrompt2', 'textEditor.pirpProblemPrompt3'] },
  { headingKey: 'textEditor.pirpIntervention', promptKeys: ['textEditor.pirpInterventionPrompt1', 'textEditor.pirpInterventionPrompt2', 'textEditor.pirpInterventionPrompt3'] },
  { headingKey: 'textEditor.pirpResponse', promptKeys: ['textEditor.pirpResponsePrompt1', 'textEditor.pirpResponsePrompt2', 'textEditor.pirpResponsePrompt3'] },
  { headingKey: 'textEditor.pirpPlan', promptKeys: ['textEditor.pirpPlanPrompt1', 'textEditor.pirpPlanPrompt2', 'textEditor.pirpPlanPrompt3'] },
];

export function buildTemplateContent(templateId: SessionTemplateId | undefined, t: TranslateFn): object | null {
  if (!templateId || templateId === 'blank') return null;

  const sectionsByTemplate: Record<Exclude<SessionTemplateId, 'blank'>, TemplateSection[]> = {
    soap: SOAP_SECTIONS,
    dap: DAP_SECTIONS,
    birp: BIRP_SECTIONS,
    girp: GIRP_SECTIONS,
    pirp: PIRP_SECTIONS,
  };

  const sections = sectionsByTemplate[templateId];
  if (!sections) return null;

  return {
    type: 'doc',
    content: sections.flatMap((section) => buildSection(t, section)),
  };
}