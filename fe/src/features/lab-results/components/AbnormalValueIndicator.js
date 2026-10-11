/**
 * AbnormalValueIndicator Component
 * 
 * Component để hiển thị cảnh báo cho các giá trị xét nghiệm bất thường
 * dựa trên flagging configuration
 */

import React, { useState, useEffect } from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import testOrderService from '../../../services/testOrderService';

// Helper: Determine flag level for a parameter value
const determineFlagLevel = (value, config) => {
  if (!value || !config) return null;
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return null;

  // Check critical levels first
  if (config.criticalLow !== null && numValue < config.criticalLow) {
    return {
      level: 'CRITICAL_LOW',
      color: 'danger',
      icon: '🔴',
      label: 'Cực thấp',
      message: `Giá trị ${numValue} < ${config.criticalLow} (nguy hiểm)`
    };
  }
  
  if (config.criticalHigh !== null && numValue > config.criticalHigh) {
    return {
      level: 'CRITICAL_HIGH',
      color: 'danger',
      icon: '🔴',
      label: 'Cực cao',
      message: `Giá trị ${numValue} > ${config.criticalHigh} (nguy hiểm)`
    };
  }

  // Check warning levels
  if (config.warningLow !== null && numValue < config.warningLow) {
    return {
      level: 'WARNING_LOW',
      color: 'warning',
      icon: '⚠️',
      label: 'Thấp',
      message: `Giá trị ${numValue} < ${config.warningLow} (cần chú ý)`
    };
  }
  
  if (config.warningHigh !== null && numValue > config.warningHigh) {
    return {
      level: 'WARNING_HIGH',
      color: 'warning',
      icon: '⚠️',
      label: 'Cao',
      message: `Giá trị ${numValue} > ${config.warningHigh} (cần chú ý)`
    };
  }

  // Value is normal
  return {
    level: 'NORMAL',
    color: 'success',
    icon: '✅',
    label: 'Bình thường',
    message: `Giá trị ${numValue} trong khoảng bình thường`
  };
};

// Single Parameter Flag Indicator
export const ParameterFlagIndicator = ({ param, config }) => {
  if (!param || !param.Value) return null;
  
  const flag = determineFlagLevel(param.Value, config);
  if (!flag || flag.level === 'NORMAL') return null;

  const tooltip = (
    <Tooltip>
      <div>
        <strong>{param.ParamName || param.paramName}</strong>
        <div>{flag.message}</div>
        {config && (
          <div className="mt-1">
            <small>
              Giá trị bình thường: {config.normalLow} - {config.normalHigh} {param.Unit || ''}
            </small>
          </div>
        )}
      </div>
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <Badge bg={flag.color} className="ms-2">
        {flag.icon} {flag.label}
      </Badge>
    </OverlayTrigger>
  );
};

// Inline value style based on flag
export const getParameterValueStyle = (value, config) => {
  if (!value || !config) return {};
  
  const flag = determineFlagLevel(value, config);
  if (!flag) return {};

  switch (flag.level) {
    case 'CRITICAL_LOW':
    case 'CRITICAL_HIGH':
      return {
        color: '#dc3545',
        fontWeight: 'bold',
        backgroundColor: '#f8d7da',
        padding: '2px 6px',
        borderRadius: '4px'
      };
    case 'WARNING_LOW':
    case 'WARNING_HIGH':
      return {
        color: '#856404',
        fontWeight: '600',
        backgroundColor: '#fff3cd',
        padding: '2px 6px',
        borderRadius: '4px'
      };
    case 'NORMAL':
    default:
      return {};
  }
};

// Summary Badge for entire test result
export const TestResultFlagSummary = ({ parameters, configs }) => {
  const [flagCounts, setFlagCounts] = useState({
    critical: 0,
    warning: 0,
    normal: 0
  });

  useEffect(() => {
    if (!parameters || parameters.length === 0) return;

    let critical = 0;
    let warning = 0;
    let normal = 0;

    parameters.forEach(param => {
      if (!param.Value) return;
      
      const config = configs.find(c => 
        c.parameterName === param.ParamName || 
        c.parameterAbbr === param.Abbreviation
      );
      
      const flag = determineFlagLevel(param.Value, config);
      
      if (!flag) return;
      
      if (flag.level.includes('CRITICAL')) {
        critical++;
      } else if (flag.level.includes('WARNING')) {
        warning++;
      } else {
        normal++;
      }
    });

    setFlagCounts({ critical, warning, normal });
  }, [parameters, configs]);

  if (flagCounts.critical === 0 && flagCounts.warning === 0) {
    return (
      <Badge bg="success" className="ms-2">
        ✅ Tất cả bình thường
      </Badge>
    );
  }

  return (
    <div className="d-inline">
      {flagCounts.critical > 0 && (
        <Badge bg="danger" className="ms-2">
          🔴 {flagCounts.critical} giá trị nguy hiểm
        </Badge>
      )}
      {flagCounts.warning > 0 && (
        <Badge bg="warning" className="ms-2">
          ⚠️ {flagCounts.warning} giá trị cần chú ý
        </Badge>
      )}
    </div>
  );
};

// Hook to load and use flagging configurations
export const useFlaggingConfigurations = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await testOrderService.getAllFlaggingConfigurations();
      
      if (result.success) {
        setConfigs(result.data || []);
      } else {
        setError(result.message || 'Failed to load flagging configurations');
        setConfigs([]);
      }
    } catch (err) {
      setError(err.message);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const getConfigForParameter = (paramName, paramAbbr) => {
    return configs.find(c => 
      c.parameterName === paramName || 
      c.parameterAbbr === paramAbbr
    );
  };

  const checkParameterValue = (param) => {
    const config = getConfigForParameter(
      param.ParamName || param.paramName,
      param.Abbreviation || param.abbreviation
    );
    
    return determineFlagLevel(param.Value || param.value, config);
  };

  return {
    configs,
    loading,
    error,
    getConfigForParameter,
    checkParameterValue,
    reload: loadConfigs
  };
};

// Default flagging configuration structure (for reference)
export const DEFAULT_FLAGGING_CONFIG = {
  id: null,
  parameterName: '',
  parameterAbbr: '',
  unit: '',
  normalLow: null,
  normalHigh: null,
  warningLow: null,
  warningHigh: null,
  criticalLow: null,
  criticalHigh: null,
  gender: 'All', // 'Male', 'Female', 'All'
  ageMin: 0,
  ageMax: 999
};

export default {
  ParameterFlagIndicator,
  getParameterValueStyle,
  TestResultFlagSummary,
  useFlaggingConfigurations,
  determineFlagLevel
};

// =====================================================
// INTEGRATION INSTRUCTIONS
// =====================================================

/**
 * How to integrate Flagging System into ResultsDashboardPage.jsx:
 * 
 * 1. Import the hook and components:
 *    import { 
 *      useFlaggingConfigurations, 
 *      ParameterFlagIndicator,
 *      getParameterValueStyle,
 *      TestResultFlagSummary 
 *    } from './AbnormalValueIndicator';
 * 
 * 2. Use the hook in your component:
 *    const { configs, loading: loadingConfigs, getConfigForParameter } = useFlaggingConfigurations();
 * 
 * 3. Add flag indicators in parameter table:
 *    <Table>
 *      <tbody>
 *        {selectedTestParams.map((param, index) => {
 *          const config = getConfigForParameter(param.ParamName, param.Abbreviation);
 *          const valueStyle = getParameterValueStyle(param.Value, config);
 *          
 *          return (
 *            <tr key={index}>
 *              <td>{param.ParamName}</td>
 *              <td>
 *                <span style={valueStyle}>{param.Value}</span>
 *                <ParameterFlagIndicator param={param} config={config} />
 *              </td>
 *              <td>{param.Unit}</td>
 *              <td>{param.NormalRange}</td>
 *            </tr>
 *          );
 *        })}
 *      </tbody>
 *    </Table>
 * 
 * 4. Add summary badge in test list:
 *    <TestResultFlagSummary 
 *      parameters={test.results?.params || []} 
 *      configs={configs} 
 *    />
 */

// =====================================================
// EXAMPLE FLAGGING CONFIGURATION DATA
// =====================================================

/**
 * Example configuration for WBC (White Blood Cell Count):
 * {
 *   id: 'flag-config-1',
 *   parameterName: 'White Blood Cell Count',
 *   parameterAbbr: 'WBC',
 *   unit: '10^9/L',
 *   normalLow: 4.0,
 *   normalHigh: 10.0,
 *   warningLow: 3.0,
 *   warningHigh: 12.0,
 *   criticalLow: 2.0,
 *   criticalHigh: 15.0,
 *   gender: 'All',
 *   ageMin: 18,
 *   ageMax: 99
 * }
 * 
 * Visual indicators:
 * - Value < 2.0 (critical low): 🔴 Red badge "Cực thấp"
 * - Value 2.0-3.0 (warning low): ⚠️ Yellow badge "Thấp"
 * - Value 3.0-4.0 (below normal): ⚠️ Yellow badge "Dưới bình thường"
 * - Value 4.0-10.0 (normal): ✅ No badge or green "Bình thường"
 * - Value 10.0-12.0 (above normal): ⚠️ Yellow badge "Trên bình thường"
 * - Value 12.0-15.0 (warning high): ⚠️ Yellow badge "Cao"
 * - Value > 15.0 (critical high): 🔴 Red badge "Cực cao"
 */
