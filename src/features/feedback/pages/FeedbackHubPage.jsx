/**
 * Patient Feedback & Rating Hub Page
 * 
 * Supports:
 * - Patients: Submit new feedback/ratings, view past submissions, edit/delete own reviews.
 * - Clinic Managers: Review all feedback, analyze rating distribution, and submit official replies.
 * - Doctors, Receptionists, Administrators: View patient reviews, service department ratings, and manager responses.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Row, Col, Card, Badge, Button, Form, 
  InputGroup, Modal, Spinner, ProgressBar, Alert 
} from 'react-bootstrap';
import { Star, MessagesSquare, Reply, SquarePen, Trash2, Search, RefreshCw, UserCheck, User, Stethoscope, Plus, ArrowLeft, Package } from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROLES, resolveRoleId } from '../../../constants/roles';
import { patientFeedbackService } from '../../../services/patientFeedbackService';
import { fetchServiceCatalog } from '../../catalog/api/catalogApi';

const FeedbackHubPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userRole, userRoleId } = useAuth();

  // The server is the authoritative boundary for authorization and MongoDB operations.
  // These client-side role checks tailor the UI presentation (tabs, modals, and actions).
  const currentRoleId = useMemo(() => resolveRoleId(user) ?? resolveRoleId(userRoleId), [user, userRoleId]);

  const isPatient = useMemo(() => {
    return currentRoleId === ROLES.PATIENT || userRole === 'patient';
  }, [currentRoleId, userRole]);

  // Exclusively Admin has permission to moderate and delete feedback
  const isAdmin = useMemo(() => {
    return currentRoleId === ROLES.ADMIN || userRole === 'admin' || userRole === 'administrator';
  }, [currentRoleId, userRole]);

  // Clinic Managers and Admins can view analytics and submit official responses
  const isManagerOrAdmin = useMemo(() => {
    return currentRoleId === ROLES.ADMIN || currentRoleId === ROLES.MANAGER || userRole === 'admin' || userRole === 'manager';
  }, [currentRoleId, userRole]);



  const [feedbacks, setFeedbacks] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);
  const [filterMyOnly, setFilterMyOnly] = useState(false);
  const [eligibility, setEligibility] = useState({ isEligible: true, reason: '', completedReferenceCodes: [] });
  const [adminDeleteReason, setAdminDeleteReason] = useState('');

  // Filters
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [packageFilter, setPackageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [eligiblePackages, setEligiblePackages] = useState([]);
  const [catalogPackages, setCatalogPackages] = useState([]);

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    rating: 5,
    serviceCategory: 'Đánh giá gói xét nghiệm',
    title: '',
    comment: '',
    appointmentId: '',
    servicePackageId: '',
    servicePackageCode: '',
    servicePackageName: '',
    doctorName: '',
    isAnonymous: false
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    rating: 5,
    serviceCategory: 'Tư vấn bác sĩ',
    title: '',
    comment: '',
    isAnonymous: false
  });

  // Response Form State (For Manager)
  const [responseForm, setResponseForm] = useState({
    response: '',
    respondedBy: user?.fullName || 'Quản lý phòng khám (Clinic Manager)'
  });

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      if (isPatient) {
        if (user?.id) {
          const [myRes, eligibleRes, eligRes] = await Promise.all([
            patientFeedbackService.getPatientFeedbacks(user.id),
            patientFeedbackService.getMyEligiblePackages(),
            patientFeedbackService.checkEligibility().catch(() => null)
          ]);
          if (myRes.success) {
            const list = Array.isArray(myRes.data) ? myRes.data : [];
            setMyFeedbacks(list);
            setFeedbacks(list);
          }
          if (eligibleRes.success) {
            setEligiblePackages(Array.isArray(eligibleRes.data) ? eligibleRes.data : []);
          }
          if (eligRes?.data) {
            setEligibility(eligRes.data);
          }
        }
        return;
      }

      const ratingVal = ratingFilter !== 'ALL' ? parseInt(ratingFilter) : null;
      const requests = [
        patientFeedbackService.getFeedbacks({
          rating: ratingVal,
          category: categoryFilter,
          status: statusFilter,
          servicePackageId: packageFilter !== 'ALL' ? packageFilter : undefined,
          searchTerm: searchTerm.trim()
        }),
        patientFeedbackService.getStatistics()
      ];
      if (isPatient) {
        requests.push(patientFeedbackService.checkEligibility());
      }

      const [feedbacksRes, statsRes, eligRes] = await Promise.all(requests);

      if (feedbacksRes?.success) {
        const list = Array.isArray(feedbacksRes.data) ? feedbacksRes.data : [];
        setFeedbacks(list);
        if (isPatient && user?.id) {
          setMyFeedbacks(list.filter(f => f.patientId === user.id));
        }
      } else if (feedbacksRes?.message) {
        setAlertMsg({ type: 'danger', text: feedbacksRes.message });
      }
      if (statsRes?.success) {
        setStatistics(statsRes.data);
      }
      if (isPatient && eligRes?.data) {
        setEligibility(eligRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, categoryFilter, packageFilter, statusFilter, searchTerm, user, isPatient]);

  useEffect(() => {
    fetchServiceCatalog()
      .then((res) => {
        if (Array.isArray(res?.packages)) setCatalogPackages(res.packages);
      })
      .catch(() => {});
  }, []);

  const queryAutoOpenedRef = React.useRef('');
  useEffect(() => {
    if (!isPatient) return;
    const qApt = searchParams.get('appointmentId') || '';
    const qPkgId = searchParams.get('packageId') || '';
    const qPkgCode = searchParams.get('packageCode') || '';
    const signature = `${qApt}|${qPkgId}|${qPkgCode}`;
    if ((!qApt && !qPkgId && !qPkgCode) || queryAutoOpenedRef.current === signature) return;

    const matchedEligible = eligiblePackages.find(
      (item) =>
        (qApt && (String(item.appointmentCode).toLowerCase() === qApt.toLowerCase() || String(item.appointmentId).toLowerCase() === qApt.toLowerCase())) ||
        (qPkgId && String(item.servicePackageId).toLowerCase() === qPkgId.toLowerCase()) ||
        (qPkgCode && String(item.servicePackageCode).toLowerCase() === qPkgCode.toLowerCase())
    );
    const matchedCatalog = catalogPackages.find(
      (p) =>
        (qPkgId && String(p.id).toLowerCase() === qPkgId.toLowerCase()) ||
        (qPkgCode && String(p.packageCode).toLowerCase() === qPkgCode.toLowerCase()) ||
        (qPkgId && String(p.packageCode).toLowerCase() === qPkgId.toLowerCase())
    );

    if (matchedEligible?.alreadyReviewed && matchedEligible?.existingFeedbackId) {
      const existingFb = myFeedbacks.find((f) => f.feedbackId === matchedEligible.existingFeedbackId);
      if (existingFb) {
        queryAutoOpenedRef.current = signature;
        setSelectedFeedback(existingFb);
        setEditForm({
          rating: existingFb.rating,
          serviceCategory: existingFb.serviceCategory,
          title: existingFb.title,
          comment: existingFb.comment,
          isAnonymous: existingFb.isAnonymous
        });
        setShowEditModal(true);
        return;
      }
    }

    if (matchedEligible || matchedCatalog || qApt || qPkgId || qPkgCode) {
      queryAutoOpenedRef.current = signature;
      setCreateForm((prev) => ({
        ...prev,
        serviceCategory: 'Đánh giá gói xét nghiệm',
        appointmentId: matchedEligible?.appointmentCode || qApt || '',
        servicePackageId: matchedEligible?.servicePackageId || matchedCatalog?.id || qPkgId || '',
        servicePackageCode: matchedEligible?.servicePackageCode || matchedCatalog?.packageCode || qPkgCode || '',
        servicePackageName: matchedEligible?.servicePackageName || matchedCatalog?.packageName || '',
        doctorName: matchedEligible?.doctorName || prev.doctorName || ''
      }));
      setShowCreateModal(true);
    }
  }, [isPatient, searchParams, eligiblePackages, catalogPackages, myFeedbacks]);

  const unreviewedEligiblePackages = useMemo(
    () => eligiblePackages.filter((item) => !item.alreadyReviewed),
    [eligiblePackages]
  );

  const openCreateFeedbackModal = useCallback((preferredItem = null) => {
    const target = preferredItem || unreviewedEligiblePackages[0] || null;
    if (!eligibility.isEligible || !target) {
      setAlertMsg({
        type: 'warning',
        text: !eligibility.isEligible
          ? `Chưa đủ điều kiện gửi đánh giá: ${eligibility.reason || 'Bạn cần hoàn thành ít nhất 1 gói xét nghiệm để gửi đánh giá.'}`
          : eligiblePackages.length > 0
            ? 'Bạn đã đánh giá tất cả các gói xét nghiệm đã sử dụng.'
            : 'Bạn chưa có gói xét nghiệm nào đã sử dụng để gửi đánh giá.'
      });
      return;
    }

    setCreateForm({
      rating: 5,
      serviceCategory: 'Đánh giá gói xét nghiệm',
      title: '',
      comment: '',
      appointmentId: target.appointmentCode || target.appointmentId || '',
      servicePackageId: target.servicePackageId || '',
      servicePackageCode: target.servicePackageCode || '',
      servicePackageName: target.servicePackageName || '',
      doctorName: target.doctorName || '',
      isAnonymous: false
    });
    setShowCreateModal(true);
  }, [eligibility, eligiblePackages.length, unreviewedEligiblePackages]);

  const displayedFeedbacks = useMemo(() => {
    if (filterMyOnly && isPatient && user?.id) {
      return feedbacks.filter(f => f.patientId === user.id);
    }
    return feedbacks;
  }, [feedbacks, filterMyOnly, isPatient, user]);

  const feedbackPag = usePagination(displayedFeedbacks, 8);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Handle Create Feedback Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      setAlertMsg({ type: 'danger', text: 'Không xác định tài khoản bệnh nhân. Vui lòng đăng nhập lại.' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...createForm,
        patientId: user.id,
        patientName: user?.fullName || user?.username || 'Bệnh nhân',
        patientEmail: user?.email || '',
        patientPhone: user?.phone || ''
      };

      const res = await patientFeedbackService.createFeedback(payload);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Cảm ơn quý khách! Đánh giá và góp ý của bạn đã được gửi tới Ban Quản Lý.' });
        setShowCreateModal(false);
        setCreateForm({
          rating: 5,
          serviceCategory: 'Đánh giá gói xét nghiệm',
          title: '',
          comment: '',
          appointmentId: '',
          servicePackageId: '',
          servicePackageCode: '',
          servicePackageName: '',
          doctorName: '',
          isAnonymous: false
        });
        if (searchParams.toString()) setSearchParams({}, { replace: true });
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi gửi đánh giá' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Feedback Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    try {
      setSubmitting(true);
      const res = await patientFeedbackService.updateFeedback(selectedFeedback.feedbackId, editForm);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Cập nhật đánh giá thành công!' });
        setShowEditModal(false);
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi cập nhật' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Manager Response Submit
  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    try {
      setSubmitting(true);
      const res = await patientFeedbackService.respondToFeedback(selectedFeedback.feedbackId, {
        response: responseForm.response,
        respondedBy: responseForm.respondedBy || user?.fullName || 'Quản lý phòng khám'
      });
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Đã gửi phản hồi chính thức cho bệnh nhân thành công!' });
        setShowResponseModal(false);
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi gửi phản hồi' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Submit (Patient deletes own, or Admin requests delete with patient consent)
  const handleDeleteSubmit = async () => {
    if (!selectedFeedback) return;
    try {
      setSubmitting(true);
      const res = isAdmin
        ? await patientFeedbackService.requestAdminDelete(selectedFeedback.feedbackId, adminDeleteReason)
        : await patientFeedbackService.deleteFeedback(selectedFeedback.feedbackId);
      if (res.success) {
        setAlertMsg({
          type: 'success',
          text: isAdmin
            ? 'Đã gửi yêu cầu ẩn/xóa tới bệnh nhân. Feedback chỉ được ẩn khi bệnh nhân đồng ý!'
            : 'Đã xóa đánh giá của bạn thành công!'
        });
        setShowDeleteModal(false);
        setAdminDeleteReason('');
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi thao tác' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConsentDelete = async (fb, approved) => {
    try {
      setSubmitting(true);
      const res = await patientFeedbackService.respondDeleteConsent(fb.feedbackId, approved);
      if (res.success) {
        setAlertMsg({ type: approved ? 'info' : 'success', text: res.message });
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi xác nhận' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (fb) => {
    setSelectedFeedback(fb);
    setEditForm({
      rating: fb.rating,
      serviceCategory: fb.serviceCategory,
      title: fb.title,
      comment: fb.comment,
      isAnonymous: fb.isAnonymous
    });
    setShowEditModal(true);
  };

  const openResponseModal = (fb) => {
    setSelectedFeedback(fb);
    setResponseForm({
      response: fb.managerResponse || '',
      respondedBy: user?.fullName || 'Quản lý phòng khám (Manager)'
    });
    setShowResponseModal(true);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? (
          <Star key={i} className="text-warning me-1"  size="1em"/>
        ) : (
          <Star key={i} className="text-muted me-1"  size="1em"/>
        )
      );
    }
    return <span className="d-inline-flex align-items-center">{stars}</span>;
  };

  return (
    <div className="w-100">
      {/* Top Banner */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Đánh Giá Dịch Vụ</h1>
          <p className="bms-page-subtitle">Ghi nhận phản hồi từ người bệnh và lời giải đáp từ Ban Quản lý</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {isPatient && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => navigate('/')}
              className="d-flex align-items-center gap-1.5 rounded-pill px-3"
            >
              <ArrowLeft  size="1em"/>
              <span>Trang chủ</span>
            </Button>
          )}

          {isPatient && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreateFeedbackModal()}
              className="d-flex align-items-center gap-1.5 rounded-pill px-3 fw-semibold"
            >
              <Plus  size="1em"/>
              <span>Gửi đánh giá mới</span>
            </Button>
          )}

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={fetchFeedbacks}
            disabled={loading}
            className="d-flex align-items-center gap-1.5 rounded-pill px-3"
          >
            <RefreshCw className={loading ? 'fa-spin' : ''}  size="1em"/>
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {isPatient && !loading && !eligibility.isEligible && (
        <Alert variant="info" className="border-0 rounded-3 mb-3 d-flex align-items-start gap-2" style={{ background: '#EFF6FF', borderLeft: '4px solid #3B82F6 !important' }}>
          <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>📋</div>
          <div>
            <strong>Điều kiện gửi đánh giá:</strong> Bạn cần hoàn thành ít nhất <strong>1 lịch khám / đơn xét nghiệm thành công</strong> trước khi có thể gửi đánh giá.
            {eligibility.reason && <div className="mt-1 text-muted small">{eligibility.reason}</div>}
            <div className="mt-2">
              <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={() => navigate('/appointments')}>
                📅 Đặt lịch khám ngay
              </Button>
              <span className="ms-2 text-muted small">Bạn vẫn có thể xem các đánh giá bên dưới.</span>
            </div>
          </div>
        </Alert>
      )}

      {alertMsg && (
        <Alert variant={alertMsg.type} dismissible onClose={() => setAlertMsg(null)} className="border-0 rounded-3">
          {alertMsg.text}
        </Alert>
      )}

      {/* Statistics Overview Card */}
      {statistics && (
        <Row className="g-3 mb-4">
          <Col xs={12} md={4}>
            <div className="bms-kpi-quad-card h-100 text-center d-flex flex-column justify-content-center">
              <div className="bms-kpi-label mb-2">Đánh giá trung bình</div>
              <div className="display-5 fw-bold mb-1 d-flex align-items-center justify-content-center gap-2 text-dark">
                <span>{statistics.averageRating}</span>
                <Star className="text-warning fs-3"  size="1em"/>
              </div>
              <div className="mb-2">
                {renderStars(Math.round(statistics.averageRating))}
              </div>
              <div className="text-muted small">
                Tổng <strong>{statistics.totalFeedbacks}</strong> lượt đánh giá
              </div>
            </div>
          </Col>

          <Col xs={12} md={5}>
            <div className="bms-kpi-quad-card h-100">
              <div className="bms-kpi-label mb-3">Phân bổ xếp hạng sao</div>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = statistics.ratingDistribution?.[star] || 0;
                const pct = statistics.totalFeedbacks > 0 ? (count / statistics.totalFeedbacks) * 100 : 0;
                return (
                  <div key={star} className="d-flex align-items-center gap-2 mb-2 small">
                    <span className="fw-semibold text-dark d-inline-flex align-items-center gap-1" style={{ width: '42px' }}>
                      {star} <Star className="text-warning" size={11} />
                    </span>
                    <div className="flex-grow-1">
                      <ProgressBar 
                        now={pct} 
                        variant={star >= 4 ? 'success' : star === 3 ? 'warning' : 'danger'} 
                        style={{ height: '8px' }} 
                        className="rounded-pill"
                      />
                    </div>
                    <span className="text-muted text-end" style={{ width: '40px', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </Col>

          <Col xs={12} md={3}>
            <Card className="border-0 shadow-sm h-100 bg-white" style={{ borderRadius: 18 }}>
              <Card.Body className="p-2 d-flex flex-column justify-content-between">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase mb-1">
                    {isManagerOrAdmin ? 'Đã phản hồi (CSKH / Quản lý)' : 'Đã có phản hồi từ trung tâm'}
                  </div>
                  <h3 className="fw-bold text-success mb-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{statistics.respondedFeedbacks}</h3>
                  <small className="text-muted">
                    {isManagerOrAdmin ? 'Đã giải đáp ý kiến người bệnh' : 'Trung tâm đã phản hồi ý kiến của bạn'}
                  </small>
                </div>
                <hr className="my-2" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }} />
                <div>
                  <div className="text-muted small fw-semibold text-uppercase mb-1">Chờ tiếp nhận</div>
                  <h3 className="fw-bold mb-0" style={{ color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{statistics.pendingFeedbacks}</h3>
                  <small className="text-muted">Đang chờ xử lý ý kiến</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Single-Line Filter Bar */}
      <div className="bms-filter-bar d-flex flex-wrap align-items-center gap-2 mb-3">
        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: '230px' }}>
          <Search className="bms-search-icon" size="1em" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, nội dung, tên bệnh nhân, bác sĩ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Form.Select
          size="sm"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="rounded-pill"
          style={{ width: 'auto', minWidth: '145px', background: '#FFFFFF', paddingTop: '7px', paddingBottom: '7px' }}
        >
          <option value="ALL">Tất cả số sao</option>
          <option value="5">5 Sao</option>
          <option value="4">4 Sao</option>
          <option value="3">3 Sao</option>
          <option value="2">2 Sao</option>
          <option value="1">1 Sao</option>
        </Form.Select>

        <Form.Select
          size="sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-pill"
          style={{ width: 'auto', minWidth: '185px', background: '#FFFFFF', paddingTop: '7px', paddingBottom: '7px' }}
        >
          <option value="ALL">Tất cả nhóm dịch vụ</option>
          <option value="Đánh giá gói xét nghiệm">Đánh giá gói xét nghiệm</option>
          <option value="Đón tiếp & Lễ tân">Đón tiếp & Lễ tân</option>
          <option value="Lấy mẫu máu & Xét nghiệm">Lấy mẫu máu & Xét nghiệm</option>
          <option value="Tư vấn bác sĩ">Tư vấn bác sĩ</option>
          <option value="Thời gian chờ & Cơ sở vật chất">Cơ sở vật chất & Thời gian chờ</option>
          <option value="Thanh toán & Hóa đơn">Thanh toán & Hóa đơn</option>
        </Form.Select>

        {isManagerOrAdmin && catalogPackages.length > 0 && (
          <Form.Select
            size="sm"
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="rounded-pill"
            style={{ width: 'auto', maxWidth: '250px', background: '#FFFFFF', paddingTop: '7px', paddingBottom: '7px' }}
          >
            <option value="ALL">Tất cả gói dịch vụ</option>
            {catalogPackages.map((pkg) => (
              <option key={pkg.id || pkg.packageCode} value={pkg.id || pkg.packageCode}>
                {pkg.packageCode ? `[${pkg.packageCode}] ` : ''}{pkg.packageName}
              </option>
            ))}
          </Form.Select>
        )}

        <Form.Select
          size="sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-pill"
          style={{ width: 'auto', minWidth: '165px', background: '#FFFFFF', paddingTop: '7px', paddingBottom: '7px' }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">Chờ phản hồi</option>
          <option value="REVIEWED">Đã xem xét</option>
          <option value="RESPONDED">{isManagerOrAdmin ? 'Đã phản hồi (nội bộ)' : 'Đã có phản hồi'}</option>
        </Form.Select>
      </div>

      {isPatient && myFeedbacks.length > 0 && (
        <div className="mb-3 d-flex align-items-center">
          <Form.Check
            type="switch"
            id="filter-my-only"
            label={`Chỉ xem đánh giá của tôi (${myFeedbacks.length})`}
            checked={filterMyOnly}
            onChange={(e) => setFilterMyOnly(e.target.checked)}
            className="fw-semibold text-primary small"
          />
        </div>
      )}

      {/* Feedbacks List */}
      {loading && displayedFeedbacks.length === 0 ? (
        <div className="text-center py-3">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted small">Đang tải danh sách đánh giá & phản hồi...</p>
        </div>
      ) : displayedFeedbacks.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {feedbackPag.paginatedItems.map((fb) => {
            const isOwn = isPatient && user?.id === fb.patientId;
            return (
              <Card key={fb.feedbackId} className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                <Card.Body className="p-2">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    {/* Review Header */}
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: '46px',
                          height: '46px',
                          backgroundColor: fb.isAnonymous ? '#f3f4f6' : '#e0f2fe',
                          color: fb.isAnonymous ? '#6b7280' : '#0284c7'
                        }}
                      >
                        {fb.isAnonymous ? <User className="fs-5"  size="1em"/> : <UserCheck className="fs-5"  size="1em"/>}
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <h6 className="mb-0 fw-bold text-dark">{fb.patientName}</h6>
                          {fb.isAnonymous && (
                            <Badge bg="secondary" className="px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                              Ẩn danh
                            </Badge>
                          )}
                          <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-normal" style={{ fontSize: '0.75rem' }}>
                            {fb.serviceCategory}
                          </Badge>
                          {(fb.servicePackageName || fb.servicePackageCode) && (
                            <Badge bg="success-subtle" className="text-success border border-success-subtle px-2 py-1 rounded-pill fw-semibold d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                              <Package size={11} />
                              <span>
                                Gói DV: {fb.servicePackageName || fb.servicePackageCode}
                                {fb.servicePackageName && fb.servicePackageCode ? ` (${fb.servicePackageCode})` : ''}
                              </span>
                            </Badge>
                          )}
                          {fb.status === 'DELETED' && (
                            <Badge bg="danger-subtle" className="text-danger border border-danger-subtle px-2 py-1 rounded-pill fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Feedback đã bị admin xóa
                            </Badge>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                          {renderStars(fb.rating)}
                          <span className="ms-1 fw-bold text-dark">{fb.rating}.0</span>
                          <span>•</span>
                          <span>{new Date(fb.createdAt).toLocaleDateString('vi-VN')} {new Date(fb.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {fb.doctorName && (
                            <>
                              <span>•</span>
                              <span className="text-primary"><Stethoscope className="me-1"  size="1em"/>{fb.doctorName}</span>
                            </>
                          )}
                          {fb.appointmentId && (
                            <>
                              <span>•</span>
                              <span className="font-monospace text-secondary">#{fb.appointmentId}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="d-flex align-items-center gap-2">
                      {/* Patient full CRUD on their own feedback */}
                      {isPatient && isOwn && fb.status !== 'HIDDEN_BY_ADMIN' && fb.status !== 'DELETED' && (
                        <>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                            onClick={() => openEditModal(fb)}
                          >
                            <SquarePen size="1em" />
                            <span>Chỉnh sửa</span>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                            onClick={() => {
                              setSelectedFeedback(fb);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 size="1em" />
                            <span>Xóa</span>
                          </Button>
                        </>
                      )}

                      {/* Clinic Manager reply button */}
                      {isManagerOrAdmin && fb.status !== 'DELETED' && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                          onClick={() => openResponseModal(fb)}
                        >
                          <Reply size="1em" />
                          <span>{fb.managerResponse ? 'Sửa phản hồi' : 'Phản hồi bệnh nhân'}</span>
                        </Button>
                      )}

                      {/* Only Admin can request delete (requires patient consent) */}
                      {isAdmin && fb.status !== 'HIDDEN_BY_ADMIN' && fb.status !== 'DELETED' && !fb.adminDeleteRequested && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                          onClick={() => {
                            setSelectedFeedback(fb);
                            setAdminDeleteReason('');
                            setShowDeleteModal(true);
                          }}
                          title="Gửi yêu cầu xóa đánh giá (Cần sự đồng ý của bệnh nhân)"
                        >
                          <Trash2 size="1em" />
                          <span>Yêu cầu xóa</span>
                        </Button>
                      )}
                      {isAdmin && fb.adminDeleteRequested && fb.status !== 'HIDDEN_BY_ADMIN' && (
                        <Badge bg="warning" text="dark" className="px-2 py-1 rounded-pill">
                          Đang chờ bệnh nhân đồng ý xóa
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Admin delete consent prompt for Patient owner */}
                  {isPatient && isOwn && fb.adminDeleteRequested && fb.status !== 'HIDDEN_BY_ADMIN' && (
                    <div className="mt-3 p-3 bg-warning-subtle border border-warning rounded-3 small">
                      <div className="fw-bold text-dark mb-1">
                        ⚠️ Admin đã gửi yêu cầu ẩn/xóa góp ý này
                      </div>
                      <div className="text-secondary mb-2">
                        Lý do: <strong>{fb.AdminDeleteReason || fb.adminDeleteReason || 'Cần rà soát nội dung'}</strong>. Bạn có đồng ý ẩn góp ý này không?
                      </div>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="danger" disabled={submitting} onClick={() => handleConsentDelete(fb, true)}>
                          Đồng ý ẩn/xóa
                        </Button>
                        <Button size="sm" variant="outline-secondary" disabled={submitting} onClick={() => handleConsentDelete(fb, false)}>
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Review Content */}
                  {fb.status === 'HIDDEN_BY_ADMIN' || fb.hiddenByAdminWithConsent ? (
                    <div className="mt-3 p-3 bg-secondary-subtle border border-secondary-subtle rounded-3 text-secondary d-flex align-items-center gap-2">
                      <Trash2 className="flex-shrink-0" size="1em" />
                      <span className="fw-semibold fst-italic">feedback được ẩn bởi admin theo sự đồng ý của patient</span>
                    </div>
                  ) : fb.status === 'DELETED' ? (
                    <div className="mt-3 p-3 bg-danger-subtle border border-danger-subtle rounded-3 text-danger d-flex align-items-center gap-2">
                      <Trash2 className="flex-shrink-0"  size="1em"/>
                      <span className="fw-semibold">Feedback đã bị admin xóa</span>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <h6 className="fw-bold text-dark mb-1">{fb.title}</h6>
                      <p className="text-secondary mb-0" style={{ lineHeight: '1.6' }}>
                        {fb.comment}
                      </p>
                    </div>
                  )}

                  {/* Manager Response Box if present */}
                  {fb.managerResponse && (
                    <div className="mt-3 p-3 bg-primary-subtle border border-primary-subtle rounded-3 small">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-bold text-primary d-flex align-items-center gap-1">
                          <Reply  size="1em"/> Phản hồi từ Ban Quản Lý Phòng Khám:
                        </span>
                        {fb.respondedAt && (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {new Date(fb.respondedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <div className="text-dark" style={{ lineHeight: '1.5' }}>
                        {fb.managerResponse}
                      </div>
                      {fb.respondedBy && (
                        <div className="text-muted mt-1 text-end" style={{ fontSize: '0.75rem' }}>
                          — <em>{fb.respondedBy}</em>
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <TablePagination
              page={feedbackPag.page}
              totalPages={feedbackPag.totalPages}
              totalItems={feedbackPag.totalItems}
              pageSize={feedbackPag.pageSize}
              onPageChange={feedbackPag.setPage}
              onPageSizeChange={feedbackPag.setPageSize}
              pageSizeOptions={[8, 15, 30]}
              itemLabel="phản hồi"
            />
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-sm rounded-4 text-center py-3 bg-white">
          <Card.Body>
            <MessagesSquare className="text-muted mb-3" style={{ fontSize: '3rem', opacity: 0.3 }}  size="1em"/>
            <h5 className="text-dark fw-bold">Chưa có phản hồi nào phù hợp</h5>
            <p className="text-muted small mb-0">Thử thay đổi bộ lọc tìm kiếm hoặc gửi phản hồi mới.</p>
          </Card.Body>
        </Card>
      )}

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <Star className="text-warning"  size="1em"/>
            Gửi Đánh Giá & Góp Ý Dịch Vụ
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body className="pt-3">
            <div className="mb-3 text-center p-3 bg-light rounded-3">
              <label className="fw-semibold small text-muted d-block mb-2">Chọn mức độ hài lòng của bạn</label>
              <div className="d-flex justify-content-center align-items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="btn p-1 border-0 bg-transparent"
                    onClick={() => setCreateForm({ ...createForm, rating: star })}
                  >
                    {star <= createForm.rating ? (
                      <Star className="text-warning display-6"  size="1em"/>
                    ) : (
                      <Star className="text-muted display-6"  size="1em"/>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-2 fw-bold text-primary">
                {createForm.rating === 5 && 'Tuyệt vời - Rất hài lòng'}
                {createForm.rating === 4 && 'Tốt - Hài lòng'}
                {createForm.rating === 3 && 'Bình thường - Tạm ổn'}
                {createForm.rating === 2 && 'Cần cải thiện dịch vụ'}
                {createForm.rating === 1 && 'Chưa hài lòng'}
              </div>
            </div>

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Gói xét nghiệm đã sử dụng</Form.Label>
                  {unreviewedEligiblePackages.length > 1 ? (
                    <Form.Select
                      value={createForm.appointmentId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const usedItem = unreviewedEligiblePackages.find(
                          (item) => (item.appointmentCode || item.appointmentId) === val
                        );
                        if (!usedItem) return;
                        setCreateForm((prev) => ({
                          ...prev,
                          serviceCategory: 'Đánh giá gói xét nghiệm',
                          appointmentId: usedItem.appointmentCode || usedItem.appointmentId || '',
                          servicePackageId: usedItem.servicePackageId || '',
                          servicePackageCode: usedItem.servicePackageCode || '',
                          servicePackageName: usedItem.servicePackageName || '',
                          doctorName: usedItem.doctorName || ''
                        }));
                      }}
                    >
                      {unreviewedEligiblePackages.map((item) => (
                        <option
                          key={item.appointmentId}
                          value={item.appointmentCode || item.appointmentId}
                        >
                          {item.servicePackageName} ({item.servicePackageCode || item.appointmentCode}) · {new Date(item.appointmentDate).toLocaleDateString('vi-VN')}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    (() => {
                      const activePkg =
                        unreviewedEligiblePackages.find(
                          (item) =>
                            (item.appointmentCode || item.appointmentId) === createForm.appointmentId ||
                            item.servicePackageId === createForm.servicePackageId
                        ) || unreviewedEligiblePackages[0];
                      const pkgName = createForm.servicePackageName || activePkg?.servicePackageName || 'Chưa có gói xét nghiệm chờ đánh giá';
                      const pkgCode = createForm.servicePackageCode || activePkg?.servicePackageCode || '';
                      const aptCode = createForm.appointmentId || activePkg?.appointmentCode || '';
                      const aptDate = activePkg?.appointmentDate
                        ? new Date(activePkg.appointmentDate).toLocaleDateString('vi-VN')
                        : '';
                      const docName = createForm.doctorName || activePkg?.doctorName || '';

                      return (
                        <div className="p-3 rounded-3 border bg-light d-flex flex-column gap-1">
                          <div className="fw-bold text-dark">
                            {pkgName}
                            {pkgCode && <span className="ms-2 badge bg-primary-subtle text-primary rounded-pill fw-semibold">{pkgCode}</span>}
                          </div>
                          <div className="small text-muted d-flex flex-wrap gap-3">
                            {aptCode && <span>Mã lịch hẹn: <strong className="text-dark">{aptCode}</strong></span>}
                            {aptDate && <span>Ngày khám: <strong className="text-dark">{aptDate}</strong></span>}
                            {docName && <span>Bác sĩ: <strong className="text-dark">{docName}</strong></span>}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tiêu đề đánh giá</Form.Label>
                  <Form.Control
                    required
                    placeholder="Tóm tắt ngắn gọn cảm nhận của bạn..."
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nội dung chi tiết nhận xét / đóng góp ý kiến</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    required
                    placeholder="Chia sẻ trải nghiệm cụ thể về thái độ phục vụ, quy trình lấy máu, tư vấn kết quả hoặc những điểm phòng khám cần cải thiện..."
                    value={createForm.comment}
                    onChange={(e) => setCreateForm({ ...createForm, comment: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check 
                  type="checkbox"
                  id="anonymous-check"
                  label="Gửi đánh giá dưới dạng Ẩn danh (Không hiển thị họ tên của tôi)"
                  checked={createForm.isAnonymous}
                  onChange={(e) => setCreateForm({ ...createForm, isAnonymous: e.target.checked })}
                  className="small text-muted"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={submitting || (!createForm.appointmentId && !createForm.servicePackageId)}>
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá ngay'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Modal (Patient) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <SquarePen className="text-primary"  size="1em"/>
            Chỉnh Sửa Đánh Giá Của Bạn
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body className="pt-3">
            <div className="mb-3 text-center p-3 bg-light rounded-3">
              <label className="fw-semibold small text-muted d-block mb-2">Mức độ hài lòng</label>
              <div className="d-flex justify-content-center align-items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="btn p-1 border-0 bg-transparent"
                    onClick={() => setEditForm({ ...editForm, rating: star })}
                  >
                    {star <= editForm.rating ? (
                      <Star className="text-warning display-6"  size="1em"/>
                    ) : (
                      <Star className="text-muted display-6"  size="1em"/>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tiêu đề</Form.Label>
                  <Form.Control
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nội dung nhận xét</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    required
                    value={editForm.comment}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Response Modal (Manager) */}
      <Modal show={showResponseModal} onHide={() => setShowResponseModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <Reply className="text-primary"  size="1em"/>
            Phản Hồi Chính Thức Cho Bệnh Nhân
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResponseSubmit}>
          <Modal.Body className="pt-3">
            {selectedFeedback && (
              <div className="p-3 bg-light rounded-3 mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <strong className="text-dark">{selectedFeedback.patientName}</strong>
                  <div className="d-flex align-items-center gap-1">
                    {renderStars(selectedFeedback.rating)}
                  </div>
                </div>
                <div className="fw-semibold text-primary">{selectedFeedback.title}</div>
                <div className="text-secondary small mt-1">{selectedFeedback.comment}</div>
              </div>
            )}
            <Form.Group>
              <Form.Label className="small fw-semibold">Nội dung phản hồi từ Ban Quản Lý</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                required
                placeholder="Viết thư cảm ơn hoặc giải trình biện pháp khắc phục của phòng khám..."
                value={responseForm.response}
                onChange={(e) => setResponseForm({ ...responseForm, response: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowResponseModal(false)}>Hủy</Button>
            <Button variant="success" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi phản hồi cho bệnh nhân'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal (Patient delete own OR Admin request delete with Patient consent) */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2">
            <Trash2 size="1em" />
            {isAdmin ? 'Gửi Yêu Cầu Xóa Đánh Giá (Admin)' : 'Xác Nhận Xóa Đánh Giá'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          {isAdmin ? (
            <>
              <p>
                Bạn muốn gửi yêu cầu ẩn/xóa đánh giá <strong>"{selectedFeedback?.title}"</strong>?
              </p>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Lý do yêu cầu ẩn/xóa (gửi cho bệnh nhân xem)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ví dụ: Nội dung chứa thông tin cá nhân cần bảo mật..."
                  value={adminDeleteReason}
                  onChange={(e) => setAdminDeleteReason(e.target.value)}
                />
              </Form.Group>
              <div className="alert alert-info mb-0 small">
                Theo quy định, feedback chỉ được ẩn khi <strong>bệnh nhân chủ feedback đồng ý</strong>. Khi bệnh nhân đồng ý, hệ thống sẽ hiển thị: <em>"feedback được ẩn bởi admin theo sự đồng ý của patient"</em>.
              </div>
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn xóa đánh giá <strong>"{selectedFeedback?.title}"</strong> của mình không?
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Hủy</Button>
          <Button variant="danger" onClick={handleDeleteSubmit} disabled={submitting}>
            {submitting ? 'Đang xử lý...' : (isAdmin ? 'Gửi yêu cầu đến bệnh nhân' : 'Xác nhận xóa')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FeedbackHubPage;
