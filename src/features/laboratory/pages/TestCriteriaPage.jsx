/**
 * @file TestCriteriaPage.jsx
 * @description Master data page for managing clinical laboratory test criteria & reference ranges (UC18).
 * Complies with ISO 15189:2022, Decision 2429/QD-BYT and AGENTS-DESIGN.md standards.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import testCriterionService from '../../../services/testCriterionService';
import TestCriterionFormModal from '../components/TestCriterionFormModal';
import DeactivateCriterionModal from '../components/DeactivateCriterionModal';
import './TestCriteriaPage.css';

export default function TestCriteriaPage() {
  const [criteria, setCriteria] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal states
  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    criterion: null,
  });

  const [deactivateModalState, setDeactivateModalState] = useState({
    isOpen: false,
    criterion: null,
  });

  // Debounce search ref
  const searchTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const fetchCriteria = useCallback(
    async (page = 1, search = searchQuery, category = selectedCategory, status = statusFilter) => {
      try {
        setIsLoading(true);
        let isActiveParam = null;
        if (status === 'ACTIVE') isActiveParam = true;
        if (status === 'INACTIVE') isActiveParam = false;

        const result = await testCriterionService.getCriteria({
          page,
          pageSize: pagination.pageSize,
          search,
          category,
          isActive: isActiveParam,
        });

        setCriteria(result.items || []);
        setPagination({
          currentPage: result.currentPage || page,
          pageSize: result.pageSize || 10,
          totalCount: result.totalCount || 0,
          totalPages: result.totalPages || 1,
        });
      } catch (err) {
        showToast(err.message || 'Không thể tải danh sách chỉ số xét nghiệm.', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.pageSize, searchQuery, selectedCategory, statusFilter]
  );

  useEffect(() => {
    fetchCriteria(1, searchQuery, selectedCategory, statusFilter);
  }, [selectedCategory, statusFilter]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchCriteria(1, val, selectedCategory, statusFilter);
    }, 300);
  };

  const handleOpenCreateModal = () => {
    setFormModalState({
      isOpen: true,
      mode: 'create',
      criterion: null,
    });
  };

  const handleOpenEditModal = (criterion) => {
    setFormModalState({
      isOpen: true,
      mode: 'edit',
      criterion,
    });
  };

  const handleCloseFormModal = () => {
    setFormModalState({
      isOpen: false,
      mode: 'create',
      criterion: null,
    });
  };

  const handleSaveCriterion = async (payload) => {
    if (formModalState.mode === 'create') {
      await testCriterionService.createCriterion(payload);
      showToast(`Đã thêm chỉ số xét nghiệm [${payload.criterionCode}] thành công.`);
    } else {
      await testCriterionService.updateCriterion(formModalState.criterion.id, payload);
      showToast(`Đã cập nhật chỉ số xét nghiệm [${payload.criterionCode}] thành công.`);
    }
    handleCloseFormModal();
    fetchCriteria(pagination.currentPage);
  };

  const handleOpenDeactivateModal = (criterion) => {
    setDeactivateModalState({
      isOpen: true,
      criterion,
    });
  };

  const handleCloseDeactivateModal = () => {
    setDeactivateModalState({
      isOpen: false,
      criterion: null,
    });
  };

  const handleConfirmDeactivate = async (id) => {
    await testCriterionService.deactivateCriterion(id);
    showToast(`Đã ngưng sử dụng chỉ số [${deactivateModalState.criterion.criterionCode}] an toàn.`);
    handleCloseDeactivateModal();
    fetchCriteria(pagination.currentPage);
  };

  const getCategoryClass = (category) => {
    switch (category) {
      case 'Biochemistry':
        return 'cat-biochem';
      case 'Hematology':
        return 'cat-hematol';
      case 'Immunology':
        return 'cat-immunol';
      case 'BloodGas':
        return 'cat-bloodgas';
      default:
        return 'cat-biochem';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'Biochemistry':
        return 'Sinh hóa máu';
      case 'Hematology':
        return 'Huyết học';
      case 'Immunology':
        return 'Miễn dịch học';
      case 'BloodGas':
        return 'Khí máu & Điện giải';
      case 'Coagulation':
        return 'Đông máu';
      default:
        return category;
    }
  };

  return (
    <div className="bms-criteria-container">
      {/* Header Banner */}
      <div className="bms-criteria-header">
        <div className="bms-criteria-title-group">
          <h1>
            <span>Danh Mục Chỉ Số Xét Nghiệm</span>
            <span className="bms-iso-badge">&#9672; ISO 15189:2022 Master Data</span>
          </h1>
          <p>
            Quản lý dải tham chiếu sinh học WHO/ADA, đơn vị đo lường và ngưỡng báo động đỏ Panic Alert phục vụ phân tích lâm sàng.
          </p>
        </div>

        <div className="bms-criteria-actions">
          <button
            type="button"
            className="bms-btn bms-btn-primary"
            onClick={handleOpenCreateModal}
            id="btn-add-criterion"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>+</span>
            <span>Thêm Chỉ Số Mới</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bms-criteria-toolbar">
        <div className="bms-criteria-filters">
          <div className="bms-search-input-wrapper">
            <span className="bms-search-icon">&#128269;</span>
            <input
              type="text"
              className="bms-search-field"
              placeholder="Tìm theo mã (GLU, WBC) hoặc tên chỉ số..."
              value={searchQuery}
              onChange={handleSearchChange}
              id="input-criteria-search"
            />
          </div>

          <select
            className="bms-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            id="select-category-filter"
          >
            <option value="">Tất cả chuyên khoa</option>
            <option value="Biochemistry">Sinh hóa máu (Biochemistry)</option>
            <option value="Hematology">Huyết học (Hematology)</option>
            <option value="Immunology">Miễn dịch học (Immunology)</option>
            <option value="BloodGas">Khí máu & Điện giải (Blood Gas)</option>
            <option value="Coagulation">Đông máu (Coagulation)</option>
          </select>

          <select
            className="bms-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            id="select-status-filter"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="INACTIVE">Đã ngưng sử dụng</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          Hiển thị <strong>{criteria.length}</strong> / <strong>{pagination.totalCount}</strong> chỉ số xét nghiệm
        </div>
      </div>

      {/* Table Card */}
      <div className="bms-table-card">
        <div className="bms-table-responsive">
          <table className="bms-criteria-table">
            <thead>
              <tr>
                <th className="col-center" style={{ width: '90px' }}>Mã Chỉ Số</th>
                <th className="col-left">Tên Chỉ Số Y Tế</th>
                <th className="col-center" style={{ width: '130px' }}>Chuyên Khoa</th>
                <th className="col-center" style={{ width: '90px' }}>Đơn Vị</th>
                <th className="col-right" style={{ width: '140px' }}>Dải Bình Thường</th>
                <th className="col-right" style={{ width: '150px' }}>Ngưỡng Panic</th>
                <th className="col-center" style={{ width: '110px' }}>Trạng Thái</th>
                <th className="col-right" style={{ width: '130px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ display: 'inline-block', marginBottom: '8px' }}>&#8987;</div>
                    <div>Đang tải dữ liệu chỉ số xét nghiệm...</div>
                  </td>
                </tr>
              ) : criteria.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#128300;</div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>Không tìm thấy chỉ số xét nghiệm phù hợp</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                      Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc chuyên khoa
                    </div>
                  </td>
                </tr>
              ) : (
                criteria.map((item) => (
                  <tr key={item.id}>
                    <td className="col-center">
                      <span className="bms-code-badge">{item.criterionCode}</span>
                    </td>
                    <td className="col-left">
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.criterionName}</div>
                      {item.englishName && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.englishName}</div>
                      )}
                    </td>
                    <td className="col-center">
                      <span className={`bms-category-badge ${getCategoryClass(item.category)}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="col-center" style={{ fontWeight: 500, color: '#475569' }}>
                      {item.unit || '-'}
                    </td>
                    <td className="col-right">
                      <span className="bms-normal-range">{item.formattedNormalRange || '-'}</span>
                    </td>
                    <td className="col-right">
                      {item.formattedPanicRange && item.formattedPanicRange !== 'N/A' ? (
                        <span className="bms-panic-range">
                          <span style={{ fontSize: '11px' }}>&#9888;</span>
                          <span>{item.formattedPanicRange}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                      )}
                    </td>
                    <td className="col-center">
                      {item.isActive ? (
                        <span className="bms-status-active">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                          Áp dụng
                        </span>
                      ) : (
                        <span className="bms-status-inactive">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                          Ngưng dùng
                        </span>
                      )}
                    </td>
                    <td className="col-right">
                      <div className="bms-action-btn-group">
                        <button
                          type="button"
                          className="bms-table-action-btn"
                          title="Chỉnh sửa chỉ số"
                          onClick={() => handleOpenEditModal(item)}
                        >
                          Sửa
                        </button>
                        {item.isActive && (
                          <button
                            type="button"
                            className="bms-table-action-btn danger"
                            title="Ngưng áp dụng chỉ số"
                            onClick={() => handleOpenDeactivateModal(item)}
                          >
                            Khóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bms-pagination-bar">
          <div className="bms-pagination-info">
            Trang <strong>{pagination.currentPage}</strong> / <strong>{pagination.totalPages}</strong>
          </div>
          <div className="bms-pagination-buttons">
            <button
              type="button"
              className="bms-page-btn"
              disabled={pagination.currentPage <= 1 || isLoading}
              onClick={() => fetchCriteria(pagination.currentPage - 1)}
            >
              &larr; Trang Trước
            </button>
            <button
              type="button"
              className="bms-page-btn"
              disabled={pagination.currentPage >= pagination.totalPages || isLoading}
              onClick={() => fetchCriteria(pagination.currentPage + 1)}
            >
              Trang Sau &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <TestCriterionFormModal
        isOpen={formModalState.isOpen}
        mode={formModalState.mode}
        criterion={formModalState.criterion}
        onClose={handleCloseFormModal}
        onSave={handleSaveCriterion}
      />

      {/* Deactivate Modal */}
      <DeactivateCriterionModal
        isOpen={deactivateModalState.isOpen}
        criterion={deactivateModalState.criterion}
        onClose={handleCloseDeactivateModal}
        onConfirm={handleConfirmDeactivate}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`bms-toast ${toast.type === 'error' ? 'bms-toast-error' : 'bms-toast-success'}`}>
          <span>{toast.type === 'error' ? '&#9888;' : '&#10003;'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
