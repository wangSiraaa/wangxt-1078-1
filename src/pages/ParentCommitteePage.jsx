import React, { useState, useEffect } from 'react';
import {
  Select,
  Table,
  Button,
  Modal,
  Alert,
  Tag,
  message,
  Row,
  Col,
  Space,
  Descriptions,
  Tabs,
  Divider,
  Timeline
} from 'antd';
import {
  CheckCircleOutlined,
  LockOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  HistoryOutlined,
  SwapOutlined,
  CalendarOutlined,
  UserOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { CLASSES, SEASONS, SIZES } from '../data/mockData';
import {
  getStudentsByClass,
  isClassSeasonLocked,
  isClassSeasonConfirmed,
  confirmClassSeasonOrder,
  getClassSeasonSummary,
  getClassSeasonStatus,
  getSizeName,
  getSeasonName,
  getSeasonPrice,
  getStatusLabel,
  getStatusColor,
  getClassName,
  canSubmitSeasonOrder,
  resolvePendingReview,
  getStudentChangeLogs,
  getClassDeadline,
  getSizeSummaryBySeasonAndStatus,
  findDuplicateStudentsAcrossClasses,
  getStudentFullHistory
} from '../utils/storage';

const { Option } = Select;
const { TabPane } = Tabs;

export default function ParentCommitteePage() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0].id);
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[0].id);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, submitted: 0, draft: 0, pendingReview: 0, supplementary: 0, pending: 0, totalAmount: 0, submittedAmount: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [seasonStatus, setSeasonStatus] = useState({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pendingReviewList, setPendingReviewList] = useState([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [studentFullHistory, setStudentFullHistory] = useState(null);

  const loadData = () => {
    const classStudents = getStudentsByClass(selectedClass);
    setStudents(classStudents);
    setSummary(getClassSeasonSummary(selectedClass, selectedSeason));
    setIsLocked(isClassSeasonLocked(selectedClass, selectedSeason));
    setIsConfirmed(isClassSeasonConfirmed(selectedClass, selectedSeason));
    setSeasonStatus(getClassSeasonStatus(selectedClass, selectedSeason));

    const pending = [];
    classStudents.forEach(student => {
      const order = student.orders && student.orders[selectedSeason];
      if (order && order.status === 'pending_review') {
        pending.push({ student, order });
      }
    });
    setPendingReviewList(pending);

    setDuplicateWarnings(findDuplicateStudentsAcrossClasses(selectedSeason));
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

  const handleConfirmOrder = () => {
    if (!canSubmitSeasonOrder(selectedClass, selectedSeason)) {
      Modal.confirm({
        title: '无法确认订单',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: (
          <div>
            {summary.pending > 0 && <p>还有 <strong>{summary.pending}</strong> 名学生未录入尺码信息。</p>}
            {summary.draft > 0 && <p>还有 <strong>{summary.draft}</strong> 份试穿稿未正式提交。</p>}
            {summary.pendingReview > 0 && <p>还有 <strong>{summary.pendingReview}</strong> 条冲突记录待复核，请先处理。</p>}
            {isLocked && <p>该季节订单已锁定，无法重复确认。</p>}
          </div>
        ),
        okText: '我知道了',
        okButtonProps: { type: 'primary' },
        cancelButtonProps: { style: { display: 'none' } }
      });
      return;
    }

    const beforeConfirmCheck = confirmClassSeasonOrder(selectedClass, selectedSeason, true);
    if (beforeConfirmCheck && !beforeConfirmCheck.success && beforeConfirmCheck.duplicates && beforeConfirmCheck.duplicates.length > 0) {
      Modal.confirm({
        title: `检测到跨班重复占位（${beforeConfirmCheck.duplicates.length}人）`,
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        content: (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <p style={{ color: '#ff4d4f', marginBottom: 12 }}>以下学生在多个班级同时存在本季节有效订单，请先清理重复后再确认：</p>
            <Table
              size="small"
              pagination={false}
              bordered
              rowKey={(r) => r.studentId}
              columns={[
                { title: '学号', dataIndex: 'studentNo', width: 110 },
                { title: '姓名', dataIndex: 'studentName', width: 80 },
                {
                  title: '所在班级',
                  key: 'classes',
                  render: (_, r) => (
                    <Space wrap>
                      {r.occurrences.map(o => (
                        <Tag key={o.classId} color={o.classId === selectedClass ? 'red' : 'orange'}>
                          {o.classId === selectedClass && '★ '}
                          {getClassName(o.classId)}
                        </Tag>
                      ))}
                    </Space>
                  )
                }
              ]}
              dataSource={beforeConfirmCheck.duplicates.map(d => ({
                studentId: d.studentId,
                studentNo: d.studentNo,
                studentName: d.studentName,
                classes: d.occurrences.map(o => ({ classId: o.classId }))
              }))}
            />
            <p style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
              处理方式：联系对应班级班主任，将不应占名额的班级订单删除或标记为重复。
            </p>
          </div>
        ),
        okText: '我知道了',
        okButtonProps: { type: 'primary' },
        cancelButtonProps: { style: { display: 'none' } }
      });
      return;
    }

    Modal.confirm({
      title: `确认${getSeasonName(selectedSeason)}班级订单`,
      icon: <ExclamationCircleOutlined style={{ color: '#1677ff' }} />,
      content: (
        <div>
          <p>您即将确认 <strong>{CLASSES.find(c => c.id === selectedClass)?.name}</strong> 的 <strong>{getSeasonName(selectedSeason)}</strong> 校服订单。</p>
          <p style={{ marginBottom: 0 }}>确认后：</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>学生已提交的尺码信息将不可修改</li>
            <li>订单将进入待锁单状态，等待供应商锁定后安排生产</li>
            <li>如后续发现遗漏，可走补录流程</li>
            <li>总金额：<strong style={{ color: '#1677ff' }}>¥{summary.submittedAmount}</strong></li>
            <li>学生人数：<strong>{summary.submitted}</strong> 人（含 {summary.supplementary} 条补录）</li>
          </ul>
        </div>
      ),
      okText: '确认下单',
      okButtonProps: { type: 'primary', danger: true },
      cancelText: '取消',
      onOk: () => {
        const result = confirmClassSeasonOrder(selectedClass, selectedSeason);
        if (result && result.success) {
          message.success(`${getSeasonName(selectedSeason)}订单确认成功，已提交给供应商`);
          loadData();
        } else {
          Modal.error({
            title: '确认失败',
            content: result?.message || '未知错误，请刷新后重试'
          });
        }
      }
    });
  };

  const handleResolveReview = (studentId, accept) => {
    const result = resolvePendingReview(studentId, selectedSeason, accept, '家委会');
    if (result.success) {
      message.success(result.message);
      loadData();
    } else {
      message.error(result.message);
    }
  };

  const handleViewDetail = (student) => {
    setSelectedStudent(student);
    setStudentFullHistory(getStudentFullHistory(student.id));
    setDetailModalVisible(true);
  };

  const getStudentSeasonOrder = (student) => {
    return student.orders && student.orders[selectedSeason]
      ? student.orders[selectedSeason]
      : { size: null, status: 'pending', submittedAt: null, isSupplementary: false };
  };

  const renderStatusTag = (order) => {
    const status = order.status;
    const color = getStatusColor(status);
    const label = getStatusLabel(status);

    let icon = null;
    if (status === 'submitted') icon = <CheckCircleOutlined />;
    else if (status === 'draft') icon = <FileTextOutlined />;
    else if (status === 'pending_review') icon = <ExclamationCircleOutlined />;
    else if (status === 'supplementary') icon = <CheckCircleOutlined />;
    else icon = <ExclamationCircleOutlined />;

    const tag = (
      <Tag icon={icon} color={color}>
        {label}
        {order.isSupplementary && <span style={{ marginLeft: 4 }}>·补录</span>}
      </Tag>
    );

    if (status === 'pending_review') {
      const hasSizeChange = order.pendingSize && order.pendingSize !== order.size;
      const hasClassChange = order.pendingToClass || order.fromClass;

      return (
        <Space direction="vertical" size={2}>
          {tag}
          {hasSizeChange && (
            <span style={{ fontSize: 12, color: '#faad14' }}>
              尺码:{getSizeName(order.size)} → {getSizeName(order.pendingSize)}
            </span>
          )}
          {hasClassChange && (
            <span style={{ fontSize: 12, color: '#722ed1' }}>
              <SwapOutlined /> {order.fromClass ? getClassName(order.fromClass) : '原班'} → {order.pendingToClass ? getClassName(order.pendingToClass) : '本班'}
            </span>
          )}
        </Space>
      );
    }
    return tag;
  };

  const logTypeLabel = (type) => {
    const map = {
      draft: '保存试穿稿',
      submit: '正式提交',
      supplementary: '补录',
      supplementary_submit: '补录提交',
      conflict: '尺码冲突',
      class_change: '班级变更',
      review_accept: '复核通过',
      review_reject: '复核驳回',
      confirm: '订单确认',
      lock: '订单锁定'
    };
    return map[type] || type;
  };

  const columns = [
    {
      title: '学号',
      dataIndex: 'studentNo',
      key: 'studentNo',
      width: 120
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '尺码',
      key: 'size',
      width: 120,
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        return order.size ? getSizeName(order.size) : <Tag color="red">未选择</Tag>;
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
      width: 200,
      render: (_, record) => renderStatusTag(getStudentSeasonOrder(record))
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => {
        const order = getStudentSeasonOrder(record);
        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
            {order.status === 'pending_review' && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleResolveReview(record.id, true)}
                  style={{ color: '#52c41a' }}
                >
                  通过
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleResolveReview(record.id, false)}
                  style={{ color: '#ff4d4f' }}
                >
                  驳回
                </Button>
              </>
            )}
          </Space>
        );
      }
    }
  ];

  const pendingColumns = [
    {
      title: '学号',
      key: 'studentNo',
      width: 100,
      render: (_, { student }) => student.studentNo
    },
    {
      title: '姓名',
      key: 'name',
      width: 80,
      render: (_, { student }) => student.name
    },
    {
      title: '类型',
      key: 'type',
      width: 110,
      render: (_, { order }) => {
        const hasSizeChange = order.pendingSize && order.pendingSize !== order.size;
        const hasClassChange = order.pendingToClass || order.fromClass;
        if (hasSizeChange && hasClassChange) {
          return <Tag color="magenta">尺码+班级变更</Tag>;
        } else if (hasClassChange) {
          return <Tag color="purple">班级变更</Tag>;
        }
        return <Tag color="orange">尺码冲突</Tag>;
      }
    },
    {
      title: '尺码变更',
      key: 'sizeChange',
      width: 150,
      render: (_, { order }) => {
        const hasSizeChange = order.pendingSize && order.pendingSize !== order.size;
        if (!hasSizeChange) return <span style={{ color: '#999' }}>无</span>;
        return (
          <Space>
            <Tag color="default">{getSizeName(order.size)}</Tag>
            →
            <Tag color="blue">{getSizeName(order.pendingSize)}</Tag>
          </Space>
        );
      }
    },
    {
      title: '班级变更',
      key: 'classChange',
      width: 180,
      render: (_, { order }) => {
        const hasClassChange = order.pendingToClass || order.fromClass;
        if (!hasClassChange) return <span style={{ color: '#999' }}>无</span>;
        return (
          <Space>
            <SwapOutlined style={{ color: '#722ed1' }} />
            <Tag color="default">{order.fromClass ? getClassName(order.fromClass) : '原班'}</Tag>
            →
            <Tag color="purple">{order.pendingToClass ? getClassName(order.pendingToClass) : '本班'}</Tag>
          </Space>
        );
      }
    },
    {
      title: '更新时间',
      key: 'time',
      width: 170,
      render: (_, { order }) => order.updatedAt || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, { student }) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleResolveReview(student.id, true)}
          >
            通过
          </Button>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleResolveReview(student.id, false)}
          >
            驳回
          </Button>
        </Space>
      )
    }
  ];

  const statusDescription = () => {
    if (isLocked) {
      return (
        <Alert
          message={`${getSeasonName(selectedSeason)}订单已锁定`}
          description={`订单已于 ${seasonStatus.lockedAt} 锁定，已提交给供应商安排生产。`}
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
          message={`${getSeasonName(selectedSeason)}订单已确认`}
          description={`订单已于 ${seasonStatus.confirmedAt} 确认，等待供应商锁定后安排生产。`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          className="info-alert"
        />
      );
    }
    if (summary.pendingReview > 0) {
      return (
        <Alert
          message="有待复核记录"
          description={`有 ${summary.pendingReview} 条冲突或换班记录待复核，请先处理后再确认订单。`}
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="info-alert"
        />
      );
    }
    if (summary.pending > 0 || summary.draft > 0) {
      return (
        <Alert
          message="订单未完成"
          description={
            <span>
              {summary.pending > 0 && `还有 ${summary.pending} 名学生未提交尺码信息。`}
              {summary.draft > 0 && ` 还有 ${summary.draft} 份试穿稿未正式提交。`}
            </span>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="info-alert"
        />
      );
    }
    return null;
  };

  const sizeSummary = getSizeSummaryBySeasonAndStatus(selectedSeason, ['submitted', 'supplementary']);
  const deadline = getClassDeadline(selectedClass, selectedSeason);

  return (
    <div>
      <h2 className="page-title">
        <TeamOutlined /> 家委会 - 班级订单确认
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
            <div className="stat-label">总金额</div>
          </div>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Tabs activeKey={selectedSeason} onChange={handleSeasonChange}>
          {SEASONS.map(season => (
            <TabPane
              tab={
                <span>
                  {season.icon} {season.name}
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

      {duplicateWarnings.length > 0 && (
        <Alert
          message={<span><ExclamationCircleOutlined /> <strong>跨班重复占位警告（{duplicateWarnings.length}人）</strong></span>}
          description={
            <div>
              <div style={{ marginBottom: 8 }}>
                以下学生在多个班级同时存在本季节有效订单，需先处理再确认订单：
              </div>
              <Space wrap>
                {duplicateWarnings.map(w => (
                  <Tag key={w.studentId} color="red" style={{ padding: '4px 10px' }}>
                    <IdcardOutlined /> {w.studentNo} - {w.studentName}
                    <span style={{ marginLeft: 8, opacity: 0.85 }}>
                      （{w.occurrences.map(o => getClassName(o.classId)).join('、')}）
                    </span>
                  </Tag>
                ))}
              </Space>
            </div>
          }
          type="error"
          showIcon
          className="info-alert"
          closable
        />
      )}

      {statusDescription()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 500 }}>选择班级：</span>
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
            <Tag color="orange">截止：{deadline}</Tag>
          )}
          {isConfirmed && <Tag color="green">已确认</Tag>}
          {isLocked && <Tag color="red">已锁定</Tag>}
        </div>
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleConfirmOrder}
            disabled={isConfirmed || isLocked || summary.pending > 0 || summary.draft > 0 || summary.pendingReview > 0}
            danger
          >
            确认并下单
          </Button>
        </Space>
      </div>

      {pendingReviewList.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <h3 className="section-title" style={{ marginTop: 0, marginBottom: 8 }}>
              <ExclamationCircleOutlined style={{ color: '#faad14' }} /> 待复核记录（{pendingReviewList.length}条）
            </h3>
            <div className="table-container">
              <Table
                columns={pendingColumns}
                dataSource={pendingReviewList}
                rowKey={(r) => r.student.id}
                pagination={false}
                bordered
                size="middle"
              />
            </div>
          </div>
          <Divider />
        </>
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <div className="section-title" style={{ marginTop: 0, marginBottom: 12 }}>
              {getSeasonName(selectedSeason)}尺码统计
            </div>
            <Row gutter={8}>
              {sizeSummary.map(item => (
                <Col span={3} key={item.id}>
                  <div style={{
                    background: item.count > 0 ? 'white' : '#fafafa',
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRadius: 6,
                    border: '1px solid #e8e8e8'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: item.count > 0 ? '#1677ff' : '#ccc' }}>{item.count}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>{item.height}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Col>
      </Row>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          pagination={false}
          bordered
        />
      </div>

      <div className="summary-total">
        合计：{summary.submitted} 人已提交（含{summary.supplementary}条补录），总金额 ¥{summary.submittedAmount}
        {summary.pending > 0 && (
          <span style={{ color: '#ff4d4f', marginLeft: 12 }}>
            （还有 {summary.pending} 人未提交，无法确认订单）
          </span>
        )}
        {summary.draft > 0 && (
          <span style={{ color: '#1890ff', marginLeft: 12 }}>
            （{summary.draft} 份试穿稿未正式提交）
          </span>
        )}
        {summary.pendingReview > 0 && (
          <span style={{ color: '#faad14', marginLeft: 12 }}>
            （{summary.pendingReview} 条待复核）
          </span>
        )}
        {summary.pending === 0 && summary.draft === 0 && summary.pendingReview === 0 && !isConfirmed && (
          <span style={{ color: '#52c41a', marginLeft: 12 }}>
            （所有学生已提交，可以确认订单）
          </span>
        )}
      </div>

      <Modal
        title="学生详情 - 全景历史"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={820}
      >
        {selectedStudent && studentFullHistory && (
          <>
            <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label={<span><IdcardOutlined /> 学号</span>}>
                {selectedStudent.studentNo}
              </Descriptions.Item>
              <Descriptions.Item label={<span><UserOutlined /> 姓名</span>}>
                {selectedStudent.name}
              </Descriptions.Item>
              <Descriptions.Item label={<span><TeamOutlined /> 当前班级</span>}>
                {CLASSES.find(c => c.id === selectedStudent.classId)?.name}
              </Descriptions.Item>
            </Descriptions>

            {studentFullHistory.duplicates && studentFullHistory.duplicates.length > 0 && (
              <Alert
                message={<span><ExclamationCircleOutlined /> <strong>跨班重复占位警告</strong></span>}
                description={
                  <div>
                    该学生在以下班级存在有效订单，请联系对应班主任确认归属：
                    <div style={{ marginTop: 8 }}>
                      {studentFullHistory.duplicates.map(d => (
                        <div key={d.seasonId} style={{ marginBottom: 4 }}>
                          <strong>{d.seasonName}</strong>：
                          {d.duplicates.map(r => (
                            <Tag key={r.id} color="red" style={{ marginLeft: 4 }}>
                              {getClassName(r.classId)} - {r.size ? getSizeName(r.size) : '未录入'}
                            </Tag>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                closable
              />
            )}

            <Divider orientation="left">
              <CalendarOutlined /> 各季节订单与截止时间
            </Divider>
            <Row gutter={8} style={{ marginBottom: 16 }}>
              {studentFullHistory.seasonSummaries.map(ss => {
                const order = ss.order;
                const locked = ss.classSeasonStatus?.locked;
                const confirmed = ss.classSeasonStatus?.confirmed;
                const deadline = ss.deadline;
                return (
                  <Col span={12} key={ss.seasonId}>
                    <div style={{
                      background: order && order.size ? '#f0f5ff' : '#fafafa',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid ' + (locked ? '#ff7875' : confirmed ? '#95de64' : '#e8e8e8'),
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>
                          {ss.seasonIcon} {ss.seasonName}
                        </span>
                        <Space size={4}>
                          {locked && <Tag color="error" icon={<LockOutlined />}>已锁定</Tag>}
                          {!locked && confirmed && <Tag color="success" icon={<CheckCircleOutlined />}>已确认</Tag>}
                        </Space>
                      </div>
                      {deadline && (
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>
                          <CalendarOutlined /> 截止：{deadline}
                          {confirmed && ss.classSeasonStatus?.confirmedAt && (
                            <span style={{ marginLeft: 10 }}>
                              <CheckCircleOutlined /> 确认：{ss.classSeasonStatus.confirmedAt}
                            </span>
                          )}
                          {locked && ss.classSeasonStatus?.lockedAt && (
                            <span style={{ marginLeft: 10 }}>
                              <LockOutlined /> 锁定：{ss.classSeasonStatus.lockedAt}
                            </span>
                          )}
                        </div>
                      )}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ fontSize: 13 }}>
                        尺码：{order && order.size ? getSizeName(order.size) : <Tag color="red">未录入</Tag>}
                        {order && order.isSupplementary && (
                          <Tag color="purple" style={{ marginLeft: 8 }}>补录</Tag>
                        )}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {order ? renderStatusTag(order) : <Tag color="default">待录入</Tag>}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>

            <Divider orientation="left">
              <HistoryOutlined /> 操作时间线
            </Divider>
            {studentFullHistory.changeLogs && studentFullHistory.changeLogs.length > 0 ? (
              <Timeline
                mode="left"
                style={{ paddingLeft: 0 }}
                items={studentFullHistory.changeLogs.slice(0, 15).map(log => ({
                  color: log.type.includes('conflict') || log.type.includes('reject') ? 'red'
                    : log.type.includes('submit') || log.type.includes('lock') || log.type.includes('accept') || log.type.includes('confirm') ? 'green'
                    : log.type.includes('review') || log.type.includes('class_change') ? 'orange' : 'blue',
                  label: <div style={{ fontSize: 12, color: '#999' }}>{log.timestamp}</div>,
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {logTypeLabel(log.type)}
                        {log.season && (
                          <Tag color="blue" style={{ marginLeft: 8 }}>{getSeasonName(log.season)}</Tag>
                        )}
                      </div>
                      <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{log.detail}</div>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                        {log.operator}
                      </div>
                    </div>
                  )
                }))}
              />
            ) : (
              <Alert message="暂无操作记录" type="info" showIcon />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
