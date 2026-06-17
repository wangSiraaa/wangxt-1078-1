import React, { useState, useEffect } from 'react';
import {
  Select,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Alert,
  message,
  Row,
  Col,
  Tabs,
  Descriptions,
  Timeline,
  Space,
  Divider,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LockOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  UserOutlined,
  HistoryOutlined,
  SendOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  TeamOutlined,
  CalendarOutlined,
  WarningOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { CLASSES, SIZES, SEASONS } from '../data/mockData';
import {
  getStudentsByClass,
  saveStudentSeasonOrder,
  submitStudentSeasonOrder,
  isClassSeasonLocked,
  isClassSeasonConfirmed,
  getClassSeasonSummary,
  getClassSeasonStatus,
  getSizeName,
  getSeasonName,
  getSeasonPrice,
  getStatusLabel,
  getStatusColor,
  getClassName,
  getStudentChangeLogs,
  getClassDeadline,
  findStudentByNoOrName,
  saveStudent,
  findStudentDuplicates,
  getStudentFullHistory,
  findDuplicateStudentsAcrossClasses
} from '../utils/storage';

const { Option } = Select;
const { TabPane } = Tabs;

export default function TeacherPage() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0].id);
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[0].id);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, submitted: 0, draft: 0, pendingReview: 0, supplementary: 0, pending: 0, totalAmount: 0, submittedAmount: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [seasonStatus, setSeasonStatus] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editMode, setEditMode] = useState('draft');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [form] = Form.useForm();
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [globalDuplicates, setGlobalDuplicates] = useState([]);

  const loadData = () => {
    const classStudents = getStudentsByClass(selectedClass);
    setStudents(classStudents);
    setSummary(getClassSeasonSummary(selectedClass, selectedSeason));
    setIsLocked(isClassSeasonLocked(selectedClass, selectedSeason));
    setIsConfirmed(isClassSeasonConfirmed(selectedClass, selectedSeason));
    setDeadline(getClassDeadline(selectedClass, selectedSeason));
    setSeasonStatus(getClassSeasonStatus(selectedClass, selectedSeason));
    setGlobalDuplicates(findDuplicateStudentsAcrossClasses(selectedSeason));
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedSeason]);

  const handleClassChange = (value) => {
    setSelectedClass(value);
  };

  const handleSeasonChange = (key) => {
    setSelectedSeason(key);
  };

  const getStudentSeasonOrder = (student) => {
    return student.orders && student.orders[selectedSeason]
      ? student.orders[selectedSeason]
      : { size: null, status: 'pending', submittedAt: null, isSupplementary: false };
  };

  const handleEdit = (student) => {
    const order = getStudentSeasonOrder(student);

    if (isLocked && (order.status === 'submitted' || order.status === 'supplementary')) {
      message.error('该季节订单已锁定，已提交的尺码不可修改，仅可通过「新增补录」按钮添加遗漏学生');
      return;
    }

    if (isConfirmed && order.status === 'submitted') {
      message.warning('该季节订单已由家委会确认，如需修改请联系家委会取消确认，或走补录流程');
      return;
    }

    setEditingStudent(student);
    setEditMode((isLocked && !order.size) ? 'supplementary' : 'normal');
    form.setFieldsValue({
      name: student.name,
      studentNo: student.studentNo,
      size: order.size,
      targetClass: student.classId
    });
    setDuplicateWarning(null);
    setEditModalVisible(true);
  };

  const checkDuplicateWarning = (studentId, studentNo, name, targetClass) => {
    if (!studentId && (studentNo || name)) {
      const existing = findStudentByNoOrName(studentNo, name);
      if (existing && existing.id) {
        const dups = findStudentDuplicates(existing.id, selectedSeason, true);
        if (dups.length > 0 && dups[0].classId !== targetClass) {
          setDuplicateWarning({
            type: 'cross_class',
            existing,
            duplicates: dups,
            message: `检测到「${existing.name}」在 ${getClassName(dups[0].classId)} 已有同季节${getSeasonName(selectedSeason)}订购记录，直接新增会造成重复占位！请使用「编辑」功能中的班级变更流程处理。`
          });
          return;
        }
      }
    }
    setDuplicateWarning(null);
  };

  const handleSubmitDraft = async () => {
    try {
      const values = await form.validateFields();
      if (!values.size) {
        message.error('请选择尺码');
        return;
      }

      checkDuplicateWarning(editingStudent?.id, values.studentNo, values.name, values.targetClass);
      if (duplicateWarning && duplicateWarning.type === 'cross_class') {
        return;
      }

      const result = saveStudentSeasonOrder(
        editingStudent.id,
        selectedSeason,
        {
          size: values.size,
          status: 'draft',
          classId: values.targetClass,
          isSupplementary: editMode === 'supplementary'
        },
        '班主任'
      );

      if (result.success) {
        if (result.pendingReview) {
          Modal.warning({
            title: '已转入待复核',
            content: result.message,
            okText: '我知道了'
          });
        } else {
          message.success(result.message);
        }
        setEditModalVisible(false);
        loadData();
      } else {
        if (result.duplicateDetected) {
          Modal.error({
            title: '重复占位警告',
            content: result.message,
            okText: '我知道了'
          });
        } else {
          message.error(result.message);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleSubmitFinal = async () => {
    try {
      const values = await form.validateFields();
      if (!values.size) {
        message.error('请选择尺码');
        return;
      }

      checkDuplicateWarning(editingStudent?.id, values.studentNo, values.name, values.targetClass);
      if (duplicateWarning && duplicateWarning.type === 'cross_class') {
        return;
      }

      let result = saveStudentSeasonOrder(
        editingStudent.id,
        selectedSeason,
        {
          size: values.size,
          status: 'submitted',
          classId: values.targetClass,
          isSupplementary: editMode === 'supplementary'
        },
        '班主任'
      );

      if (result.success && !result.pendingReview && !result.duplicateDetected) {
        result = submitStudentSeasonOrder(editingStudent.id, selectedSeason, '班主任');
      }

      if (result.success) {
        if (result.pendingReview) {
          Modal.warning({
            title: '已转入待复核（未直接覆盖）',
            icon: <WarningOutlined style={{ color: '#faad14' }} />,
            content: (
              <div>
                <p>{result.message}</p>
                <p style={{ marginBottom: 0, color: '#666' }}>系统规则：已有记录不允许直接覆盖，旧记录转为待复核状态，等待家委会审核通过后才生效。</p>
              </div>
            ),
            okText: '我知道了'
          });
        } else {
          message.success(result.message);
        }
        setEditModalVisible(false);
        loadData();
      } else {
        if (result.duplicateDetected) {
          Modal.error({
            title: '⚠️ 检测到重复占位',
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: (
              <div>
                <p>{result.message}</p>
                <Divider style={{ margin: '12px 0' }} />
                <p style={{ color: '#666', fontSize: 13, marginBottom: 0 }}>
                  <strong>处理方式：</strong>找到该学生的原班级记录，使用「编辑」功能变更班级，系统会自动将旧记录转待复核，不会重复占两次名额。
                </p>
              </div>
            ),
            okText: '我知道了',
            okButtonProps: { danger: true }
          });
        } else {
          message.error(result.message);
        }
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handlePromoteDraft = (student) => {
    const order = getStudentSeasonOrder(student);
    if (order.status === 'pending_review') {
      message.error('该记录处于待复核状态，请家委会处理后再提交');
      return;
    }
    const result = submitStudentSeasonOrder(student.id, selectedSeason, '班主任');
    if (result.success) {
      message.success(result.message);
      loadData();
    } else {
      message.error(result.message);
    }
  };

  const handleAddStudent = () => {
    if (isLocked) {
      Modal.confirm({
        title: '订单已锁定 · 补录模式',
        icon: <LockOutlined style={{ color: '#722ed1' }} />,
        content: (
          <div>
            <p>该季节订单已锁定并提交给供应商，<strong>已提交的学生尺码不可修改</strong>。</p>
            <p style={{ marginBottom: 0 }}>当前操作将进入<strong style={{ color: '#722ed1' }}>补录模式</strong>，用于补录遗漏学生或新转入学生。补录订单会作为独立批次发给供应商。</p>
          </div>
        ),
        okText: '进入补录',
        cancelText: '取消',
        onOk: () => handleAddSupplementary()
      });
      return;
    }
    if (isConfirmed) {
      Modal.confirm({
        title: '订单已确认',
        icon: <InfoCircleOutlined style={{ color: '#faad14' }} />,
        content: '该季节订单已由家委会确认，新增学生将走补录流程。是否继续？',
        okText: '继续新增（补录）',
        cancelText: '取消',
        onOk: () => handleAddSupplementary()
      });
      return;
    }
    setEditingStudent({
      id: null,
      classId: selectedClass,
      name: '',
      studentNo: '',
      orders: {}
    });
    setEditMode('new');
    form.resetFields();
    form.setFieldsValue({ targetClass: selectedClass });
    setDuplicateWarning(null);
    setEditModalVisible(true);
  };

  const handleAddSupplementary = () => {
    setEditingStudent({
      id: null,
      classId: selectedClass,
      name: '',
      studentNo: '',
      orders: {}
    });
    setEditMode('supplementary_new');
    form.resetFields();
    form.setFieldsValue({ targetClass: selectedClass });
    setDuplicateWarning(null);
    setEditModalVisible(true);
  };

  const handleConfirmNewStudent = async (submitAsDraft) => {
    try {
      const values = await form.validateFields();
      if (!values.name || !values.studentNo) {
        message.error('请填写学生姓名和学号');
        return;
      }
      if (!values.size) {
        message.error('请选择尺码');
        return;
      }

      checkDuplicateWarning(null, values.studentNo, values.name, values.targetClass);
      if (duplicateWarning && duplicateWarning.type === 'cross_class' && !editMode.startsWith('supplementary')) {
        Modal.error({
          title: '⚠️ 重复占位风险',
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          content: duplicateWarning.message,
          okText: '我知道了',
          okButtonProps: { danger: true }
        });
        return;
      }

      const existing = findStudentByNoOrName(values.studentNo, values.name);
      let studentId;
      let finalResult = null;

      if (existing) {
        studentId = existing.id;
        const orderParams = {
          size: values.size,
          status: submitAsDraft ? 'draft' : 'submitted',
          classId: values.targetClass,
          isSupplementary: editMode.startsWith('supplementary')
        };
        finalResult = saveStudentSeasonOrder(studentId, selectedSeason, orderParams, '班主任');

        if (finalResult.success && !submitAsDraft && !finalResult.pendingReview && !finalResult.duplicateDetected) {
          submitStudentSeasonOrder(studentId, selectedSeason, '班主任');
        }
        message.success(finalResult.pendingReview ? '已更新并转入待复核，等待家委会处理' : '已更新该学生的尺码信息');
      } else {
        const newId = `s${Date.now()}`;
        const newStudent = {
          id: newId,
          classId: values.targetClass || selectedClass,
          name: values.name,
          studentNo: values.studentNo,
          orders: {}
        };
        saveStudent(newStudent);
        finalResult = saveStudentSeasonOrder(newId, selectedSeason, {
          size: values.size,
          status: submitAsDraft ? 'draft' : 'submitted',
          isSupplementary: editMode.startsWith('supplementary')
        }, '班主任');

        if (!submitAsDraft && finalResult.success) {
          submitStudentSeasonOrder(newId, selectedSeason, '班主任');
        }
        message.success(editMode.startsWith('supplementary') ? '补录成功' : '新增学生并保存尺码成功');
      }

      if (finalResult && finalResult.pendingReview) {
        Modal.warning({
          title: '已转入待复核',
          content: finalResult.message,
          okText: '我知道了'
        });
      }
      if (finalResult && finalResult.duplicateDetected) {
        Modal.error({ title: '重复占位', content: finalResult.message });
        return;
      }

      setEditModalVisible(false);
      loadData();
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleViewHistory = (student) => {
    setHistoryStudent(student);
    setHistoryData(getStudentFullHistory(student.id));
    setHistoryModalVisible(true);
  };

  const renderStatusTag = (order, student) => {
    const status = order.status;
    const color = getStatusColor(status);
    const label = getStatusLabel(status);

    let icon = null;
    if (status === 'submitted') icon = <CheckCircleOutlined />;
    else if (status === 'draft') icon = <EditOutlined />;
    else if (status === 'pending_review') icon = <ExclamationCircleOutlined />;
    else if (status === 'supplementary') icon = <PlusOutlined />;
    else icon = <ClockCircleOutlined />;

    const tag = (
      <Tag icon={icon} color={color}>
        {label}
        {order.isSupplementary && <span style={{ marginLeft: 4 }}>·补录</span>}
      </Tag>
    );

    if (status === 'pending_review') {
      return (
        <Space direction="vertical" size={2}>
          {tag}
          <div style={{ fontSize: 12, color: '#faad14', lineHeight: 1.4 }}>
            {order.pendingSize ? (
              <span>原:{getSizeName(order.size)} → 申请:{getSizeName(order.pendingSize)}</span>
            ) : null}
            {order.pendingFromClass ? (
              <div>
                <SwapOutlined /> {getClassName(order.pendingFromClass)} → {getClassName(order.pendingToClass)}
              </div>
            ) : null}
          </div>
        </Space>
      );
    }
    return tag;
  };

  const columns = [
    {
      title: '学号',
      dataIndex: 'studentNo',
      key: 'studentNo',
      width: 120,
      fixed: 'left'
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left'
    },
    {
      title: '尺码',
      key: 'size',
      width: 120,
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        return order.size ? getSizeName(order.size) : <Tag color="orange">未选择</Tag>;
      }
    },
    {
      title: '金额',
      key: 'amount',
      width: 100,
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        return order.size ? `¥${getSeasonPrice(selectedSeason)}` : '-';
      }
    },
    {
      title: '状态',
      key: 'status',
      width: 190,
      render: (_, record) => renderStatusTag(getStudentSeasonOrder(record), record)
    },
    {
      title: '批次类型',
      key: 'batch',
      width: 110,
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        return order.isSupplementary
          ? <Tag color="purple" icon={<PlusOutlined />}>补录批次</Tag>
          : <Tag color="blue">正常批次</Tag>;
      }
    },
    {
      title: '提交时间',
      key: 'submittedAt',
      width: 180,
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        return order.submittedAt || order.updatedAt || '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        const canEdit = !isLocked || (order.status !== 'submitted' && order.status !== 'supplementary');
        const canPromote = order.status === 'draft' && !isLocked && !isConfirmed;

        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={!canEdit && !(isLocked && !order.size)}
            >
              {order.size ? (canEdit ? '编辑' : '查看') : '录入'}
            </Button>
            {canPromote && (
              <Tooltip title="将试穿稿转为正式提交">
                <Button
                  type="link"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => handlePromoteDraft(record)}
                  style={{ color: '#52c41a' }}
                >
                  提交
                </Button>
              </Tooltip>
            )}
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record)}
            >
              历史
            </Button>
          </Space>
        );
      }
    }
  ];

  const statusDescription = () => {
    if (globalDuplicates.length > 0) {
      return (
        <Alert
          message={<span><WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />检测到跨班级重复占位（{globalDuplicates.length}名学生）</span>}
          description={
            <div>
              {globalDuplicates.map(dup => (
                <div key={dup.key} style={{ marginBottom: 4 }}>
                  <strong>{dup.records[0].name}</strong>（{dup.key}）：
                  {dup.records.map(r => (
                    <Tag key={r.studentId} color="red" style={{ marginLeft: 4 }}>
                      {r.className} - {r.sizeName}
                    </Tag>
                  ))}
                </div>
              ))}
              <p style={{ marginTop: 8, marginBottom: 0, color: '#666' }}>请使用班级变更流程处理，避免一个人重复占两次名额影响其他学生</p>
            </div>
          }
          type="error"
          showIcon
          className="info-alert"
          closable
        />
      );
    }

    if (isLocked) {
      return (
        <Alert
          message={`${getSeasonName(selectedSeason)}订单已锁定 · ${seasonStatus.lockedAt || ''}`}
          description={
            <div>
              <p>订单已锁定并提交给供应商，<strong>已提交的学生尺码绝对不可修改</strong>。</p>
              <p style={{ marginBottom: 0 }}>如发现缺码或遗漏学生，仅可通过「<strong style={{ color: '#722ed1' }}>新增补录</strong>」按钮添加补录单，补录单会作为独立批次给供应商。</p>
            </div>
          }
          type="error"
          showIcon
          icon={<LockOutlined />}
          className="info-alert"
        />
      );
    }
    if (isConfirmed) {
      return (
        <Alert
          message={`${getSeasonName(selectedSeason)}订单已确认 · ${seasonStatus.confirmedAt || ''}`}
          description={
            <div>
              <p>家委会已确认该季节订单，<strong>已提交的学生尺码信息不可修改</strong>。</p>
              <p style={{ marginBottom: 0 }}>如需新增学生请走补录流程，如需修改已提交记录请联系家委会取消确认。</p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="info-alert"
        />
      );
    }
    if (deadline) {
      return (
        <Alert
          message={<span><CalendarOutlined style={{ marginRight: 6 }} />班级截止时间：<strong style={{ fontSize: 15 }}>{deadline}</strong></span>}
          description={
            <div>
              <p>请在截止时间前完成所有学生的尺码录入。<strong>录入流程：先保存为「试穿稿」→ 核对无误后再「正式提交」</strong>。</p>
              <p style={{ marginBottom: 0 }}>
                <Tag color="default">试穿稿</Tag> 可随时修改；
                <Tag color="success">正式提交</Tag> 后如再修改会触发「待复核」流程，由家委会审核；
                <Tag color="warning">待复核</Tag> 期间旧记录不直接覆盖。
              </p>
            </div>
          }
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          className="info-alert"
        />
      );
    }
    return null;
  };

  const logTypeLabel = (type) => {
    const map = {
      draft: '保存试穿稿',
      submit: '正式提交',
      supplementary: '补录入稿',
      supplementary_submit: '补录提交',
      conflict: '尺码冲突→待复核',
      class_change: '班级变更→待复核',
      class_change_conflict: '班级变更+尺码冲突→待复核',
      review_accept: '复核通过',
      review_reject: '复核驳回',
      class_change_accept: '班级变更复核通过',
      class_change_reject: '班级变更复核驳回',
      confirm: '订单确认',
      lock: '订单锁定'
    };
    return map[type] || type;
  };

  const logColor = (type) => {
    if (type.includes('conflict') || type.includes('reject')) return 'red';
    if (type.includes('submit') || type.includes('lock') || type.includes('accept') || type.includes('confirm')) return 'green';
    if (type.includes('review') || type.includes('change')) return 'orange';
    return 'blue';
  };

  const getEditModalTitle = () => {
    if (editMode.startsWith('supplementary')) {
      return editingStudent && editingStudent.name
        ? <span><PlusOutlined style={{ color: '#722ed1' }} /> {getSeasonName(selectedSeason)}补录 - {editingStudent.name}</span>
        : <span><PlusOutlined style={{ color: '#722ed1' }} /> {getSeasonName(selectedSeason)}新增补录</span>;
    }
    if (editMode === 'new') {
      return <span><UserOutlined /> 新增学生（正常订购流程）</span>;
    }
    return editingStudent && editingStudent.name
      ? <span><EditOutlined /> 编辑 {getSeasonName(selectedSeason)} - {editingStudent.name}</span>
      : <span><UserOutlined /> 新增学生</span>;
  };

  return (
    <div>
      <h2 className="page-title">
        <UserOutlined /> 班主任 - 学生尺码收集
      </h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <div className="stat-card">
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">学生总数</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <div className="stat-value">{summary.submitted}</div>
            <div className="stat-label">已提交</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#333' }}>
            <div className="stat-value">{summary.draft}</div>
            <div className="stat-label">试穿稿</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <div className="stat-value">{summary.pendingReview}</div>
            <div className="stat-label">待复核</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }}>
            <div className="stat-value">{summary.supplementary}</div>
            <div className="stat-label">已补录</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="stat-value">¥{summary.submittedAmount}</div>
            <div className="stat-label">已确认金额</div>
          </div>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Tabs activeKey={selectedSeason} onChange={handleSeasonChange} size="large">
          {SEASONS.map(season => (
            <TabPane
              tab={
                <span style={{ fontSize: 15, padding: '4px 8px' }}>
                  {season.icon} {season.name} <span style={{ color: '#999', fontSize: 12 }}>(¥{season.price})</span>
                  {isClassSeasonLocked(selectedClass, season.id) && (
                    <Tag color="red" style={{ marginLeft: 8 }}>已锁定</Tag>
                  )}
                  {isClassSeasonConfirmed(selectedClass, season.id) && !isClassSeasonLocked(selectedClass, season.id) && (
                    <Tag color="green" style={{ marginLeft: 8 }}>已确认</Tag>
                  )}
                </span>
              }
              key={season.id}
            />
          ))}
        </Tabs>
      </div>

      {statusDescription()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}><TeamOutlined /> 选择班级：</span>
          <Select
            value={selectedClass}
            onChange={handleClassChange}
            style={{ width: 200 }}
          >
            {CLASSES.map(cls => (
              <Option key={cls.id} value={cls.id}>{cls.name}</Option>
            ))}
          </Select>
          {deadline && (
            <Tag color="orange" icon={<CalendarOutlined />}>截止：{deadline}</Tag>
          )}
          <Tag color="blue">{getSeasonName(selectedSeason)}单价：¥{getSeasonPrice(selectedSeason)}</Tag>
        </div>
        <Space>
          {!isLocked && !isConfirmed && (
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddStudent}
            >
              添加学生（正常订购）
            </Button>
          )}
          {(isLocked || isConfirmed) && (
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddStudent}
              style={isLocked ? { borderColor: '#722ed1', color: '#722ed1' } : {}}
            >
              {isLocked ? '补录学生（锁定后用）' : '补录学生（已确认后用）'}
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddSupplementary}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            新增补录（缺码/遗漏用）
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tag icon={<SaveOutlined />} color="default"><strong>两步流程：</strong>录入后先存试穿稿 → 核对后再提交</Tag>
        <Tag icon={<WarningOutlined />} color="warning"><strong>冲突规则：</strong>已提交记录不允许直接覆盖，自动转待复核</Tag>
        <Tag icon={<SwapOutlined />} color="orange"><strong>换班规则：</strong>旧班记录转待复核，避免重复占位</Tag>
        <Tag icon={<LockOutlined />} color="error"><strong>锁定规则：</strong>锁定后只能补录，不能改原尺码</Tag>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          pagination={false}
          bordered
          scroll={{ x: 1200 }}
        />
      </div>

      <div className="summary-total">
        <strong>合计：</strong>{summary.submitted} 人已提交
        {summary.supplementary > 0 && <span>（其中 <Tag color="purple">{summary.supplementary} 条补录</Tag>）</span>}
        <span>，已确认金额 <strong style={{ color: '#1677ff' }}>¥{summary.submittedAmount}</strong></span>
        {summary.draft > 0 && (
          <span style={{ color: '#1890ff', marginLeft: 12 }}>
            （{summary.draft} 份试穿稿待正式提交）
          </span>
        )}
        {summary.pendingReview > 0 && (
          <span style={{ color: '#faad14', marginLeft: 12 }}>
            （{summary.pendingReview} 条待复核，等待家委会处理 - <strong>旧记录未直接覆盖</strong>）
          </span>
        )}
        {summary.pending > 0 && (
          <span style={{ color: '#ff4d4f', marginLeft: 12 }}>
            （还有 {summary.pending} 人未录入）
          </span>
        )}
      </div>

      <Modal
        title={getEditModalTitle()}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={600}
        maskClosable={false}
        footer={
          editingStudent && !editingStudent.id ? [
            <Button key="cancel" onClick={() => setEditModalVisible(false)}>取消</Button>,
            <Button key="draft" icon={<SaveOutlined />} onClick={() => handleConfirmNewStudent(true)}>
              {editMode.startsWith('supplementary') ? '保存为补录入稿' : '保存为试穿稿'}
            </Button>,
            <Button key="submit" type="primary" icon={<SendOutlined />} onClick={() => handleConfirmNewStudent(false)}>
              {editMode.startsWith('supplementary') ? '提交补录' : '正式提交'}
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setEditModalVisible(false)}>取消</Button>,
            <Button
              key="draft"
              icon={<SaveOutlined />}
              onClick={handleSubmitDraft}
              disabled={
                editMode === 'supplementary'
                  ? false
                  : isConfirmed || (isLocked && editingStudent && getStudentSeasonOrder(editingStudent).status === 'submitted')
              }
            >
              {editMode === 'supplementary' ? '保存为补录入稿' : '保存为试穿稿'}
            </Button>,
            <Button
              key="submit"
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmitFinal}
              disabled={
                editMode === 'supplementary'
                  ? false
                  : (isLocked && editingStudent && getStudentSeasonOrder(editingStudent).status === 'submitted')
              }
            >
              {editMode === 'supplementary' ? '提交补录' : '正式提交'}
            </Button>
          ]
        }
      >
        {editMode.startsWith('supplementary') && (
          <Alert
            message={<span><PlusOutlined style={{ color: '#722ed1' }} /> 补录说明</span>}
            description={
              <div>
                <p>补录订单将单独生成批次，供应商会看到独立的「补录批次」，<strong>不会影响已锁定的正常批次</strong>。</p>
                <p style={{ marginBottom: 0 }}>补录适用于：<strong>锁单后发现缺码</strong>、<strong>新转入学生</strong>、<strong>遗漏录入</strong>。</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={<span><UserOutlined /> 学生姓名</span>}
            rules={[{ required: true, message: '请输入学生姓名' }]}
          >
            <Input placeholder="请输入学生姓名" disabled={editingStudent && editingStudent.name} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="studentNo"
                label="学号"
                rules={[{ required: true, message: '请输入学号' }]}
              >
                <Input placeholder="请输入学号（唯一识别用）" disabled={editingStudent && editingStudent.studentNo} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="targetClass"
                label={<span><SwapOutlined /> 所在班级</span>}
                rules={[{ required: true, message: '请选择班级' }]}
                extra="变更班级时，旧班记录会转待复核，避免重复占位"
              >
                <Select placeholder="请选择班级">
                  {CLASSES.map(cls => (
                    <Option key={cls.id} value={cls.id}>{cls.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="size"
            label={<span>{getSeasonName(selectedSeason)}尺码 <Tag color="blue">¥{getSeasonPrice(selectedSeason)}/套</Tag></span>}
            rules={[{ required: true, message: '请选择尺码' }]}
            extra="选码建议：先让学生试穿，确认合体后再正式提交"
          >
            <Select placeholder="请选择尺码" size="large">
              {SIZES.map(size => (
                <Option key={size.id} value={size.id}>
                  <strong>{size.name}</strong> <span style={{ color: '#999', fontSize: 12 }}>({size.height})</span>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Descriptions column={2} size="small" style={{ marginBottom: 0 }} bordered>
            <Descriptions.Item label="季节单价">¥{getSeasonPrice(selectedSeason)}</Descriptions.Item>
            <Descriptions.Item label="提交类型">
              {editMode.startsWith('supplementary') ? (
                <Tag color="purple" icon={<PlusOutlined />}>补录订单（独立批次）</Tag>
              ) : (
                <Tag color="blue">正常订单</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="班级截止" span={2}>
              {deadline ? <Tag color="orange" icon={<CalendarOutlined />}>{deadline}</Tag> : <Tag>未设置</Tag>}
              {isConfirmed && <Tag color="success" style={{ marginLeft: 8 }} icon={<CheckCircleOutlined />}>家委会已确认</Tag>}
              {isLocked && <Tag color="error" style={{ marginLeft: 8 }} icon={<LockOutlined />}>供应商已锁定</Tag>}
            </Descriptions.Item>
          </Descriptions>
        </Form>

        {duplicateWarning && (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: 16 }}
            message={<span><ExclamationCircleOutlined /> 重复占位检测</span>}
            description={duplicateWarning.message}
          />
        )}

        <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 6, fontSize: 12, color: '#666' }}>
          <p style={{ marginBottom: 4 }}><strong>💡 录入流程提示：</strong></p>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>首次录入：点击「保存为试穿稿」，让学生试穿确认</li>
            <li>确认无误：点击「正式提交」，尺码锁定进入审核</li>
            <li>提交后修改：系统自动转「待复核」，不直接覆盖旧记录</li>
            <li>学生转班：变更班级后旧班记录转「待复核」</li>
          </ol>
        </div>
      </Modal>

      <Modal
        title={
          historyStudent
            ? <span><HistoryOutlined /> {historyStudent.name} - 历史提交、班级变更与截止时间全景</span>
            : '历史记录'
        }
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        width={820}
        footer={[
          <Button key="close" type="primary" onClick={() => setHistoryModalVisible(false)}>关闭</Button>
        ]}
      >
        {historyStudent && historyData && (
          <>
            <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学号">{historyStudent.studentNo}</Descriptions.Item>
              <Descriptions.Item label="姓名"><strong>{historyStudent.name}</strong></Descriptions.Item>
              <Descriptions.Item label="当前班级">
                <Tag color="blue" icon={<TeamOutlined />}>{getClassName(historyStudent.classId)}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {historyData.duplicates && historyData.duplicates.length > 0 && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message={<span><WarningOutlined /> ⚠️ 检测到跨班级重复占位风险</span>}
                description={
                  <div>
                    {historyData.duplicates.map(d => (
                      <div key={d.seasonId} style={{ marginBottom: 4 }}>
                        <strong>{d.seasonName}</strong>：
                        {d.duplicates.map(r => (
                          <Tag key={r.id} color="red" style={{ marginLeft: 4 }}>
                            {getClassName(r.classId)} - {r.studentNo || r.name}
                          </Tag>
                        ))}
                      </div>
                    ))}
                    <p style={{ marginTop: 8, marginBottom: 0, color: '#666' }}>请在当前班级确认前处理掉旧班级的订购记录，避免一个人占两次名额浪费资源</p>
                  </div>
                }
              />
            )}

            <Divider orientation="left">
              <span style={{ fontSize: 14 }}><CalendarOutlined /> 各季节订单状态 + 班级截止时间（串联展示）</span>
            </Divider>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              {historyData.seasonSummaries.map(ss => {
                const order = ss.order;
                const isCurrentSeason = ss.seasonId === selectedSeason;
                return (
                  <Col span={12} key={ss.seasonId}>
                    <div style={{
                      background: isCurrentSeason ? '#e6f7ff' : '#fafafa',
                      padding: 14,
                      borderRadius: 10,
                      border: isCurrentSeason ? '2px solid #1890ff' : '1px solid #e8e8e8',
                      position: 'relative'
                    }}>
                      {isCurrentSeason && (
                        <Tag color="blue" style={{ position: 'absolute', top: 8, right: 8 }}>当前选中</Tag>
                      )}
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
                        {ss.seasonIcon} {ss.seasonName} <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>¥{getSeasonPrice(ss.seasonId)}</span>
                      </div>
                      <Row gutter={8}>
                        <Col span={12}>
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                            <CalendarOutlined /> 截止：{ss.deadline || <span style={{ color: '#999' }}>未设</span>}
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                            <LockOutlined /> {ss.classSeasonStatus.locked ? '已锁定' : (ss.classSeasonStatus.confirmed ? '已确认' : '待确认')}
                          </div>
                        </Col>
                      </Row>
                      <div style={{ fontSize: 13, marginBottom: 6 }}>
                        尺码：{order && order.size ? <strong>{getSizeName(order.size)}</strong> : <Tag color="orange">未录入</Tag>}
                      </div>
                      <div>
                        {order ? renderStatusTag(order, historyStudent) : <Tag color="default">待录入</Tag>}
                      </div>
                      {(ss.classSeasonStatus.confirmedAt || ss.classSeasonStatus.lockedAt) && (
                        <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                          {ss.classSeasonStatus.confirmedAt && <div>家委会确认：{ss.classSeasonStatus.confirmedAt}</div>}
                          {ss.classSeasonStatus.lockedAt && <div>供应商锁定：{ss.classSeasonStatus.lockedAt}</div>}
                        </div>
                      )}
                    </div>
                  </Col>
                );
              })}
            </Row>

            <Divider orientation="left">
              <span style={{ fontSize: 14 }}><FileTextOutlined /> 操作时间线（{historyData.changeLogs.length}条记录）</span>
            </Divider>
            {historyData.changeLogs.length > 0 ? (
              <Timeline
                mode="left"
                style={{ marginLeft: 20 }}
                items={historyData.changeLogs.map(log => ({
                  color: logColor(log.type),
                  label: <span style={{ color: '#888', fontSize: 12 }}>{log.timestamp}</span>,
                  children: (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        <Tag color={logColor(log.type) === 'red' ? 'error' : logColor(log.type) === 'green' ? 'success' : logColor(log.type) === 'orange' ? 'warning' : 'blue'} style={{ marginRight: 6 }}>
                          {logTypeLabel(log.type)}
                        </Tag>
                        {log.season && (
                          <Tag color="blue" style={{ marginLeft: 4 }}>{getSeasonName(log.season)}</Tag>
                        )}
                      </div>
                      <div style={{ color: '#555', fontSize: 13, lineHeight: 1.5 }}>{log.detail}</div>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>操作人：{log.operator}</div>
                    </div>
                  )
                }))}
              />
            ) : (
              <Alert
                message="暂无操作记录"
                type="info"
                showIcon
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
