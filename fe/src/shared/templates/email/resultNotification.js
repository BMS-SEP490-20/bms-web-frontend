export const getResultNotificationSubject = (labTest = {}) => {
  const code = labTest.code || labTest.id || '';
  const name = labTest.testName || 'Kết quả xét nghiệm';
  return `Kết quả xét nghiệm ${code ? `#${code} ` : ''}- ${name}`;
};

export const getResultNotificationTemplate = (labTest = {}, doctorNotes = '', baseUrl = '') => {
  const patientName = labTest.patientName || (labTest.patient && labTest.patient.fullName) || '';
  const code = labTest.code || labTest.id || '';
  const testName = labTest.testName || '';
  const performedAt = labTest.performedAt || labTest.createdAt || '';
  const doctorName = (labTest && (labTest.doctorName || labTest.approvedByName)) || (doctorNotes && doctorNotes.doctorName) || '';
  const notesText = typeof doctorNotes === 'string' ? doctorNotes : (doctorNotes?.doctorNotes || doctorNotes?.notes || '');
  const resultSummary = labTest.summary || labTest.resultSummary || '';

  const viewLink = baseUrl ? `${baseUrl}/patient/results/${labTest.id || code}` : '#';

  return `
  <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.4;">
    <h2 style="color:#0b5394">Kết quả xét nghiệm ${code ? `<span style=\"font-weight:normal\">(#${code})</span>` : ''}</h2>
    ${patientName ? `<p><strong>Bệnh nhân:</strong> ${patientName}</p>` : ''}
    ${testName ? `<p><strong>Xét nghiệm:</strong> ${testName}</p>` : ''}
    ${performedAt ? `<p><strong>Ngày thực hiện:</strong> ${performedAt}</p>` : ''}

    ${resultSummary ? `<h3 style=\"margin-top:12px\">Tóm tắt kết quả</h3><p>${resultSummary}</p>` : ''}

    <h3 style="margin-top:12px">Chẩn đoán của bác sĩ</h3>
    <div style="background:#f7f7f7;padding:10px;border-radius:4px;">
      <p style="margin:0">${notesText || '<i>Không có chẩn đoán chi tiết</i>'}</p>
    </div>

    ${doctorName ? `<p style=\"margin-top:10px\"><strong>Bác sĩ:</strong> ${doctorName}</p>` : ''}

    <p style="margin-top:14px">Bạn có thể xem chi tiết kết quả tại: <a href="${viewLink}">${viewLink}</a></p>

    <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
    <p style="font-size:12px;color:#666">Nếu bạn có thắc mắc, vui lòng liên hệ phòng khám hoặc bác sĩ điều trị của bạn.</p>
  </div>
  `;
};
