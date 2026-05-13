import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Step1Form } from './Step1Form';
import { Step2Confirmation } from './Step2Confirmation';
import { type ReportStep, type ReportForm, type ViolationType } from './reportTypes';
import { reportApi } from '../../../../services/apiService';

const EMPTY_FORM: ReportForm = {
  parkingLotId: '',
  zone: '',
  spotNumber: '',
  violationType: '' as ViolationType,
  vehiclePlate: '',
  description: '',
  photo: null,
};

export function ReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<ReportStep>(1);
  const [reportId, setReportId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<ReportForm>({
    ...EMPTY_FORM,
    parkingLotId: searchParams.get('parkId') || '',
  });

  const updateForm = (updates: Partial<ReportForm>) => setForm((prev) => ({ ...prev, ...updates }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await reportApi.submit({
        parkingLotId: form.parkingLotId,
        zone: form.zone,
        spotNumber: form.spotNumber,
        violationType: form.violationType,
        vehiclePlate: form.vehiclePlate || undefined,
        description: form.description,
        photo: form.photo,
      });
      setReportId(response.id);
      setStep(2);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao enviar a denúncia. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewReport = () => {
    setForm(EMPTY_FORM);
    setSubmitError(null);
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
          submitting={submitting}
          submitError={submitError}
        />
      )}
      {step === 2 && (
        <Step2Confirmation
          reportId={reportId}
          form={form}
          onNewReport={handleNewReport}
          onGoHome={() => navigate('/')}
        />
      )}
    </div>
  );
}
