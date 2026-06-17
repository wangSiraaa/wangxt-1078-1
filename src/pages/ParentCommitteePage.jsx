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
  Descriptions
} from 'antd';
import {
  CheckCircleOutlined,
  LockOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SendOutlined
} from '@ant-design/icons';
import { CLASSES } from '../data/mockData';
import {
  getStudentsByClass,
  isClassLocked,
  isClassConfirmed,
  confirmClassOrder,
  getClassSummary,
  getSizeName,
  getTypeName,
  calculateAmount,
  canSubmitOrder,
  getOrderStatus
} from '../utils/storage';

const { Option } = Select;

export default function ParentCommitteePage() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0].id);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, submitted: 0, pending: 0, totalAmount: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [orderStatus, setOrderStatus] = useState({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadData = () => {
    const classStudents = getStudentsByClass(selectedClass);
    setStudents(classStudents);
    setSummary(getClassSummary(selectedClass));
    setIsLocked(isClassLocked(selectedClass));
    setIsConfirmed(isClassConfirmed(selectedClass));
    setOrderStatus(getOrderStatus()[selectedClass] || {});
  };

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const handleClassChange = (value) => {
    setSelectedClass(value);
  };

  const handleConfirmOrder = () => {
    if (!canSubmitOrder(selectedClass)) {
      Modal.confirm({
        title: '无法确认订单',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: summary.pending > 0
          ? `还有 ${summary.pending} 名学生未提交尺码信息，请先完成所有学生的尺码收集。`
          : '订单已锁定，无法重复确认。',
        okText: '我知道了',
        okButtonProps: { type: 'primary' },
        cancelButtonProps: { style: { display: 'none' } }
      });
      return;
    }

    Modal.confirm({
      title: '确认班级订单',
      icon: <ExclamationCircleOutlined style={{ color: '#1677ff' }} />,
      content: (
        <div>
          <p>您即将确认 <strong>{CLASSES.find(c => c.id === selectedClass)?.name}</strong> 的校服订单。</p>
          <p style={{ marginBottom: 0 }}>确认后：</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>学生尺码信息将不可修改</li>
            <li>订单将提交给供应商进行生产</li>
            <li>总金额：<strong style={{ color: '#1677ff' }}>¥{summary.totalAmount}</strong></li>
            <li>学生人数：<strong>{summary.submitted}</strong> 人</li>
          </ul>
        </div>
      ),
      okText: '确认下单',
      okButtonProps: { type: 'primary', danger: true },
      cancelText: '取消',
      onOk: () => {
        confirmClassOrder(selectedClass);
        message.success('订单确认成功，已提交给供应商');
        loadData();
      }
    });
  };

  const handleViewDetail = (student) => {
    setSelectedStudent(student);
    setDetailModalVisible(true);
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
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size) => size ? getSizeName(size) : <Tag color="red">未选择</Tag>
    },
    {
      title: '校服类型',
      dataIndex: 'types',
      key: 'types',
      render: (types) => (
        <span>
          {types && types.length > 0
            ? types.map(t => (
                <Tag key={t} color="blue">{getTypeName(t)}</Tag>
              ))
            : <Tag color="red">未选择</Tag>
          }
        </span>
      )
    },
    {
      title: '金额',
      key: 'amount',
      width: 100,
      render: (_, record) => record.types ? `¥${calculateAmount(record.types)}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        status === 'submitted'
          ? <Tag icon={<CheckCircleOutlined />} color="success">已提交</Tag>
          : <Tag icon={<ExclamationCircleOutlined />} color="error">待提交</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      )
    }
  ];

  const statusDescription = () => {
    if (isLocked) {
      return (
        <Alert
          message="订单已锁定"
          description={`订单已于 ${orderStatus.lockedAt} 锁定，已提交给供应商安排生产。`}
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
          message="订单已确认"
          description={`订单已于 ${orderStatus.confirmedAt} 确认，等待供应商锁定后安排生产。`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          className="info-alert"
        />
      );
    }
    if (summary.pending > 0) {
      return (
        <Alert
          message="订单未完成"
          description={`还有 ${summary.pending} 名学生未提交尺码信息，请督促班主任完成收集后再确认订单。`}
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="info-alert"
        />
      );
    }
    return null;
  };

  const getSizeSummary = () => {
    const sizeCount = {};
    students.filter(s => s.status === 'submitted').forEach(s => {
      if (s.size) {
        sizeCount[s.size] = (sizeCount[s.size] || 0) + 1;
      }
    });
    return Object.entries(sizeCount).map(([size, count]) => ({
      size: getSizeName(size),
      count
    }));
  };

  const getTypeSummary = () => {
    const typeCount = {};
    students.filter(s => s.status === 'submitted').forEach(s => {
      s.types.forEach(t => {
        typeCount[t] = (typeCount[t] || 0) + 1;
      });
    });
    return Object.entries(typeCount).map(([type, count]) => ({
      type: getTypeName(type),
      count
    }));
  };

  return (
    <div>
      <h2 className="page-title">
        <TeamOutlined /> 家委会 - 班级订单确认
      </h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">学生总数</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <div className="stat-value">{summary.submitted}</div>
            <div className="stat-label">已提交</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <div className="stat-value">{summary.pending}</div>
            <div className="stat-label">待提交</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="stat-value">¥{summary.totalAmount}</div>
            <div className="stat-label">总金额</div>
          </div>
        </Col>
      </Row>

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
          {isConfirmed && <Tag color="green">已确认</Tag>}
          {isLocked && <Tag color="red">已锁定</Tag>}
        </div>
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleConfirmOrder}
            disabled={isConfirmed || isLocked || summary.pending > 0}
            danger
          >
            确认并下单
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <div className="section-title" style={{ marginTop: 0, marginBottom: 12 }}>
              尺码统计
            </div>
            <Row gutter={8}>
              {getSizeSummary().map(item => (
                <Col span={8} key={item.size}>
                  <div style={{
                    background: 'white',
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRadius: 6,
                    border: '1px solid #e8e8e8'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#1677ff' }}>{item.count}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{item.size}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
            <div className="section-title" style={{ marginTop: 0, marginBottom: 12 }}>
              类型统计
            </div>
            <Row gutter={8}>
              {getTypeSummary().map(item => (
                <Col span={8} key={item.type}>
                  <div style={{
                    background: 'white',
                    padding: '12px 8px',
                    textAlign: 'center',
                    borderRadius: 6,
                    border: '1px solid #e8e8e8'
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>{item.count}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{item.type}</div>
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
        合计：{summary.submitted} 人已提交，总金额 ¥{summary.totalAmount}
        {summary.pending > 0 && (
          <span style={{ color: '#ff4d4f', marginLeft: 12 }}>
            （还有 {summary.pending} 人未提交，无法确认订单）
          </span>
        )}
        {summary.pending === 0 && !isConfirmed && (
          <span style={{ color: '#52c41a', marginLeft: 12 }}>
            （所有学生已提交，可以确认订单）
          </span>
        )}
      </div>

      <Modal
        title="学生详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={500}
      >
        {selectedStudent && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="学号">{selectedStudent.studentNo}</Descriptions.Item>
            <Descriptions.Item label="姓名">{selectedStudent.name}</Descriptions.Item>
            <Descriptions.Item label="班级">{CLASSES.find(c => c.id === selectedStudent.classId)?.name}</Descriptions.Item>
            <Descriptions.Item label="尺码">
              {selectedStudent.size ? getSizeName(selectedStudent.size) : '未选择'}
            </Descriptions.Item>
            <Descriptions.Item label="校服类型">
              {selectedStudent.types && selectedStudent.types.length > 0
                ? selectedStudent.types.map(t => getTypeName(t)).join('、')
                : '未选择'
              }
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              {selectedStudent.types ? `¥${calculateAmount(selectedStudent.types)}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedStudent.status === 'submitted'
                ? <Tag color="success">已提交</Tag>
                : <Tag color="warning">待提交</Tag>
              }
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">{selectedStudent.submittedAt || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
