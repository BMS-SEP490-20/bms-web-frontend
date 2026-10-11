/**
 * Status Filter Component
 * 
 * Reusable status filter component for consistent status filtering across the application.
 * Supports different entities (appointment, sample, labTest, invoice)
 * with customizable options and styling.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { FaFilter, FaSearch, FaCalendarAlt } from 'react-icons/fa';
import { getStatusFilterOptions } from '../../utils/status/statusHelper';

/**
 * StatusFilter Component
 * 
 * A reusable filter component for status-based filtering with support for:
 * - Multiple entities (appointment, sample, labTest, invoice, consultation)
 * - Custom filter options
 * - Search functionality
 * - Date filtering
 * - Reset functionality
 * 
 * @param {Object} props - Component props
 * @param {string} props.entity - Entity type (appointment, sample, labTest, etc.)
 * @param {string} props.value - Current filter value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.showSearch - Whether to show search input
 * @param {boolean} props.showDate - Whether to show date filter
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {string} props.dateValue - Current date value
 * @param {Function} props.onDateChange - Date change handler
 * @param {Function} props.onReset - Reset handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @returns {React.ReactNode} StatusFilter component
 */
const StatusFilter = ({
  entity,
  value,
  onChange,
  placeholder = 'Chọn trạng thái',
  showSearch = false,
  showDate = false,
  searchValue = '',
  onSearchChange,
  dateValue = '',
  onDateChange,
  onReset,
  className = '',
  style = {},
  ...props
}) => {
  const statusOptions = getStatusFilterOptions(entity, true);

  return (
    <div className={`status-filter ${className}`} style={style} {...props}>
      <Row className="g-3">
        {/* Status Filter */}
        <Col md={showSearch && showDate ? 3 : showSearch || showDate ? 4 : 6}>
          <Form.Group>
            <Form.Label className="fw-bold d-flex align-items-center">
              <FaFilter className="me-2 text-primary" />
              Trạng thái
            </Form.Label>
            <Form.Select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="border-primary"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        {/* Search Filter */}
        {showSearch && (
          <Col md={showDate ? 3 : 4}>
            <Form.Group>
              <Form.Label className="fw-bold d-flex align-items-center">
                <FaSearch className="me-2 text-primary" />
                Tìm kiếm
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="border-primary"
              />
            </Form.Group>
          </Col>
        )}

        {/* Date Filter */}
        {showDate && (
          <Col md={showSearch ? 3 : 4}>
            <Form.Group>
              <Form.Label className="fw-bold d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-primary" />
                Ngày
              </Form.Label>
              <Form.Control
                type="date"
                value={dateValue}
                onChange={(e) => onDateChange?.(e.target.value)}
                className="border-primary"
              />
            </Form.Group>
          </Col>
        )}

        {/* Reset Button */}
        <Col md={showSearch && showDate ? 3 : showSearch || showDate ? 4 : 6} className="d-flex align-items-end">
          <Form.Group className="w-100">
            <Form.Label className="fw-bold text-transparent">Reset</Form.Label>
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              onClick={onReset}
            >
              <FaFilter className="me-2" />
              Làm mới
            </button>
          </Form.Group>
        </Col>
      </Row>
    </div>
  );
};

export default StatusFilter;
