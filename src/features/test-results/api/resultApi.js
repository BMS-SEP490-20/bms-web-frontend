/**
 * @file resultApi.js
 * @description API client for laboratory test result entry and lookup (UC46).
 * Conforms to: Production Medical Standards & AGENTS-CODE.md.
 */

import api from '../../../config/api';

export const resultApi = {
  async enter(body) {
    // Format parameters conforming to CreateFullTestResultDto
    const formattedParameters = Array.isArray(body?.parameters)
      ? body.parameters.map((p) => ({
          criteriaId: p.code || p.criteriaId || 'ANL',
          paramName: p.name || p.paramName || p.code || 'Analyte',
          abbreviation: p.code || p.abbreviation || '',
          value: String(p.value ?? '')
        }))
      : [];

    const payload = {
      // The server resolves a missing order from the sample; batch IDs are not appointment IDs.
      appointmentId: body.appointmentId || undefined,
      sampleId: body.sampleId,
      deviceId: body.equipmentCode || body.deviceId || 'Sysmex XN-1000',
      status: body.status || 'waiting_review',
      reagentCode: body.reagentCode || undefined,
      quantity: Number(body.quantity) || 1,
      parameters: formattedParameters,
      notes: body.notes || undefined,
      isPanic: body.isPanic || false,
      criticalNotified: body.criticalNotified || false,
      confirmRerunChecked: body.confirmRerunChecked || false,
      doctorNotifiedName: body.doctorNotifiedName || undefined,
      notifiedAt: body.notifiedAt || undefined
    };

    try {
      const res = await api.post('/TestOrder/TestResult', payload);
      const stored = res.data?.data ?? res.data;
      const resultId = stored?.testResultId ?? stored?.id;
      if (!resultId) throw new Error('Máy chủ chưa xác nhận mã kết quả đã lưu.');
      return {
        success: true,
        resultId,
        message: 'Kết quả xét nghiệm đã được nhập và chuyển trạng thái chờ duyệt (Waiting Review).',
        isPanic: stored.isPanic || false,
        data: stored
      };
    } catch (err) {
        const msg = err.response?.data?.message || err.response?.data?.title || err.message || 'Không thể lưu kết quả xét nghiệm.';
        throw new Error(msg);
    }
  },

  async lookup(keyword) {
    try {
      const res = await api.get('/test-results', {
        params: { search: keyword || undefined }
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể tra cứu kết quả xét nghiệm.';
      throw new Error(msg);
    }
  },
};

export default resultApi;
