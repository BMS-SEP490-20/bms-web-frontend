import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';

/**
 * Clean flat workflow stepper bar that shows the exact operational sequence for a role
 * (Receptionist, Doctor, Lab Technician) and lets staff jump directly between stages.
 */
export default function WorkflowStepperBar({ title, steps = [], activeStep = 1, hint }) {
  const navigate = useNavigate();

  return (
    <div
      className="mb-3"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '14px 18px',
      }}
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2.5">
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#475569',
          }}
        >
          {title}
        </span>
        {hint && (
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            {hint}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, minmax(0, 1fr))`,
          gap: '10px',
        }}
      >
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === activeStep;
          const isDone = stepNum < activeStep;
          const clickable = Boolean(step.path || step.onClick);

          const handleStepClick = () => {
            if (typeof step.onClick === 'function') {
              step.onClick();
            } else if (step.path) {
              navigate(step.path);
            }
          };

          return (
            <button
              key={step.id || stepNum}
              type="button"
              onClick={clickable ? handleStepClick : undefined}
              style={{
                textAlign: 'left',
                border: isActive
                  ? '1.5px solid #1E60E6'
                  : isDone
                    ? '1px solid #A7F3D0'
                    : '1px solid #E2E8F0',
                backgroundColor: isActive
                  ? '#EFF6FF'
                  : isDone
                    ? '#ECFDF5'
                    : '#F8FAFC',
                borderRadius: '10px',
                padding: '10px 12px',
                cursor: clickable ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                width: '100%',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  minWidth: '24px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: isActive
                    ? '#1E60E6'
                    : isDone
                      ? '#059669'
                      : '#E2E8F0',
                  color: isActive || isDone ? '#FFFFFF' : '#475569',
                  marginTop: '1px',
                }}
              >
                {isDone ? <Check size={13} strokeWidth={2.75} /> : stepNum}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  className="d-flex align-items-center justify-content-between gap-1"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: isActive ? '#1E40AF' : isDone ? '#065F46' : '#1E293B',
                    lineHeight: 1.3,
                  }}
                >
                  <span>{step.label}</span>
                  {clickable && !isActive && (
                    <ChevronRight size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  )}
                </span>
                {step.desc && (
                  <span
                    className="d-block"
                    style={{
                      fontSize: '11.5px',
                      color: '#64748B',
                      lineHeight: 1.4,
                      marginTop: '3px',
                    }}
                  >
                    {step.desc}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
