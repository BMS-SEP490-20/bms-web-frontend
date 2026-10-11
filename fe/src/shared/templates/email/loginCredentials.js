/**
 * Login Credentials Email Template
 * 
 * Template for login credentials emails sent to newly registered patients.
 */

export const getLoginCredentialsTemplate = (patientEmail, username, password, baseUrl = '') => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0066cc; text-align: center;">🎉 Đăng ký tài khoản thành công!</h2>
      
      <p>Xin chào,</p>
      
      <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Hệ thống Quản lý Phòng Xét nghiệm</strong>.</p>
      
      <p>Tài khoản của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập:</p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>📧 Email đăng nhập:</strong> ${patientEmail}</p>
        <p style="margin: 5px 0;"><strong>👤 Tên đăng nhập:</strong> ${username}</p>
        <p style="margin: 5px 0;"><strong>🔐 Mật khẩu:</strong> <code style="background-color: #e9ecef; padding: 5px 10px; border-radius: 4px; font-size: 16px; font-weight: bold;">${password}</code></p>
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #96781fff; border-radius: 5px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⚠️ Lưu ý quan trọng:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
          <li>Vui lòng lưu giữ thông tin đăng nhập này một cách an toàn</li>
          <li>Để bảo mật, bạn nên đổi mật khẩu sau khi đăng nhập lần đầu</li>
          <li>Không chia sẻ thông tin đăng nhập với người khác</li>
        </ul>
      </div>
      
      <p>Bạn có thể sử dụng thông tin trên để đăng nhập vào hệ thống tại: <a href="${baseUrl}/login" style="color: #0066cc;">${baseUrl}/login</a></p>
      
      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
      
      <p style="color: #6c757d; font-size: 12px; text-align: center;">
        <em>Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.</em><br>
        Nếu bạn không thực hiện đăng ký, vui lòng liên hệ với chúng tôi ngay lập tức.
      </p>
    </div>
  `;
};

export const getLoginCredentialsSubject = () => {
  return 'Thông tin đăng nhập tài khoản - Hệ thống Quản lý Phòng Xét nghiệm';
};

