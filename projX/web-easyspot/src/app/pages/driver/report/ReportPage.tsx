import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Step1Form } from './Step1Form';
import { Step2Confirmation } from './Step2Confirmation';
import { type ReportStep, type ReportForm, type ViolationType } from './reportTypes';

const EMPTY_FORM: ReportForm = {
  parkingLotId: '',
  zone: '',
  spotNumber: '',
  violationType: '' as ViolationType,
  vehiclePlate: '',
  description: '',
};

export function ReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<ReportStep>(1);
  const [reportId, setReportId] = useState('');
  const [form, setForm] = useState<ReportForm>({
    ...EMPTY_FORM,
    parkingLotId: searchParams.get('parkId') || '',
  });

  const updateForm = (updates: Partial<ReportForm>) => setForm((prev) => ({ ...prev, ...updates }));

  const handleSubmit = () => {
    setReportId(`REP${Date.now().toString().slice(-6)}`);
    setStep(2);
  };

  const handleNewReport = () => {
    setForm(EMPTY_FORM);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {step === 1 && (
        <Step1Form
          form={form}
          onChange={updateForm}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      )}
      {step === 2 && (
        <Step2Confirmation
          reportId={reportId}
          form={form}
          onViewReports={() => navigate('/denuncias')}
          onNewReport={handleNewReport}
          onGoHome={() => navigate('/')}
        />
      )}
    </div>
  );
}
