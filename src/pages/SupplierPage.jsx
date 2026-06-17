import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Tag,
  Row,
  Col,
  Card,
  Descriptions,
  Select,
  Space,
  Alert,
  message,
  Divider
} from 'antd';
import {
  ShopOutlined,
  CheckCircleOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  LockFilled
} from '@ant-design/icons';
import { CLASSES, UNIFORM_TYPES, SIZES } from '../data/mockData';
import {
  getProductionSummary,
  getStudents,
  getOrderStatus,
  isClassLocked,
  isClassConfirmed,
  lockClassOrder,
  getClassName,
  getSizeName,
  getTypeName,
  calculateAmount,
  getClassSummary
} from '../utils/storage';

const { Option } = Select;

export default function SupplierPage() {
  const [productionSummary, setProductionSummary] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [orderStatus, setOrderStatus] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [classSummary, setClassSummary] = useState({ total: 0, submitted: 0, pending: 0, totalAmount: 0 });

  const loadData = () => {
    setProductionSummary(getProductionSummary());
    setAllStudents(getStudents());
    setOrderStatus(getOrderStatus());
  };

  useEffect(() => {
    loadData();
  }, []);

  const getClassOrderStatus = () => {
    return CLASSES.map(cls => {
      const status = orderStatus[cls.id] || {};
      const summary = getClassSummary(cls.id);
      return {
        ...cls,
        ...status,
        ...summary
      };
    });
  };

  const handleViewClassDetail = (classId) => {
    setSelectedClass(classId);
    const students = getStudents().filter(s => s.classId === classId && s.status === 'submitted');
    setClassStudents(students);
    setClassSummary(getClassSummary(classId));
    setDetailModalVisible(true);
  };

  const handleLockOrder = (classId) => {
    const classInfo = CLASSES.find(c => c.id === classId);
    if (!isClassConfirmed(classId)) {
      message.error('该班级订单尚未经过家委会确认，无法锁定');
      return;
    }
    if (isClassLocked(classId)) {
      message.warning('该班级订单已锁定');
      return;
    }

    Modal.confirm({
      title: '锁定订单',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>您即将锁定 <strong>{classInfo?.name}</strong> 的校服订单。</p>
          <p style={{ marginBottom: 0 }}>锁定后：</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>订单将进入生产流程，不可撤销</li>
            <li>已提交的学生尺码信息不可修改</li>
            <li>仅可补录未提交的学生信息</li>
          </ul>
        </div>
      ),
      okText: '确认锁定',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        lockClassOrder(classId);
        message.success('订单已锁定，可以开始生产');
        loadData();
      }
    });
  };

  const handleLockAll = () => {
    const unLockedClasses = CLASSES.filter(
      cls => isClassConfirmed(cls.id) && !isClassLocked(cls.id)
    );

    if (unLockedClasses.length === 0) {
      message.warning('没有可锁定的订单');
      return;
    }

    Modal.confirm({
      title: '批量锁定订单',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>您即将锁定以下 {unLockedClasses.length} 个班级的订单：</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            {unLockedClasses.map(cls => (
              <li key={cls.id}>{cls.name}</li>
            ))}
          </ul>
        </div>
      ),
      okText: '确认全部锁定',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        unLockedClasses.forEach(cls => lockClassOrder(cls.id));
        message.success(`已锁定 ${unLockedClasses.length} 个班级订单`);
        loadData();
      }
    });
  };

  const getPivotData = () => {
    const pivot = {};
    const types = UNIFORM_TYPES.map(t => t.id);
    const sizes = SIZES.map(s => s.id);

    types.forEach(type => {
      pivot[type] = {};
      sizes.forEach(size => {
        pivot[type][size] = 0;
      });
      pivot[type].total = 0;
    });

    productionSummary.forEach(item => {
      if (pivot[item.type] && pivot[item.type][item.size] !== undefined) {
        pivot[item.type][item.size] += item.count;
        pivot[item.type].total += item.count;
      }
    });

    const sizeTotals = {};
    sizes.forEach(size => {
      sizeTotals[size] = types.reduce((sum, type) => sum + pivot[type][size], 0);
    });

    return { pivot, sizeTotals };
  };

  const { pivot, sizeTotals } = getPivotData();

  const classOrderColumns = [
    {
      title: '班级',
      dataIndex: 'name',
      key: 'name',
      width: 150
    },
    {
      title: '学生总数',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'center'
    },
    {
      title: '已提交',
      dataIndex: 'submitted',
      key: 'submitted',
      width: 100,
      align: 'center',
      render: (value, record) => (
        <span>
          {value}
          {record.pending > 0 && (
            <Tag color="orange" style={{ marginLeft: 4 }}>{record.pending}人未交</Tag>
          )}
        </span>
      )
    },
    {
      title: '总金额',
      key: 'totalAmount',
      width: 120,
      align: 'center',
      render: (_, record) => `¥${record.totalAmount}`
    },
    {
      title: '确认状态',
      dataIndex: 'confirmed',
      key: 'confirmed',
      width: 120,
      align: 'center',
      render: (confirmed, record) => (
        confirmed
          ? <Tag icon={<CheckCircleOutlined />} color="success">已确认</Tag>
          : <Tag icon={<ExclamationCircleOutlined />} color="warning">待确认</Tag>
      )
    },
    {
      title: '确认时间',
      dataIndex: 'confirmedAt',
      key: 'confirmedAt',
      width: 180
    },
    {
      title: '锁定状态',
      dataIndex: 'locked',
      key: 'locked',
      width: 120,
      align: 'center',
      render: (locked) => (
        locked
          ? <Tag icon={<LockOutlined />} color="error">已锁定</Tag>
          : <Tag color="default">未锁定</Tag>
      )
    },
    {
      title: '锁定时间',
      dataIndex: 'lockedAt',
      key: 'lockedAt',
      width: 180
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewClassDetail(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<LockFilled />}
            onClick={() => handleLockOrder(record.id)}
            disabled={!record.confirmed || record.locked}
            danger
          >
            锁定
          </Button>
        </Space>
      )
    }
  ];

  const pivotColumns = [
    {
      title: '校服类型',
      dataIndex: 'typeName',
      key: 'typeName',
      width: 120,
      fixed: 'left'
    },
    ...SIZES.map(size => ({
      title: size.name,
      dataIndex: size.id,
      key: size.id,
      width: 100,
      align: 'center',
      render: (value) => value > 0 ? <strong>{value}</strong> : '-'
    })),
    {
      title: '合计',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (value) => <strong style={{ color: '#1677ff' }}>{value}</strong>
    }
  ];

  const pivotData = UNIFORM_TYPES.map(type => ({
    key: type.id,
    typeName: type.name,
    ...pivot[type.id]
  }));

  const totalRow = {
    key: 'total',
    typeName: <strong>尺码合计</strong>,
    ...Object.fromEntries(SIZES.map(s => [s.id, sizeTotals[s.id]])),
    total: Object.values(sizeTotals).reduce((a, b) => a + b, 0)
  };

  const totalAmount = allStudents
    .filter(s => s.status === 'submitted')
    .reduce((sum, s) => sum + calculateAmount(s.types), 0);

  const totalStudents = allStudents.filter(s => s.status === 'submitted').length;
  const lockedClasses = CLASSES.filter(c => isClassLocked(c.id)).length;
  const confirmedClasses = CLASSES.filter(c => isClassConfirmed(c.id)).length;

  const detailColumns = [
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
      render: (size) => getSizeName(size)
    },
    {
      title: '校服类型',
      dataIndex: 'types',
      key: 'types',
      render: (types) => types.map(t => (
        <Tag key={t} color="blue">{getTypeName(t)}</Tag>
      ))
    },
    {
      title: '金额',
      key: 'amount',
      width: 100,
      render: (_, record) => `¥${calculateAmount(record.types)}`
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180
    }
  ];

  return (
    <div>
      <h2 className="page-title">
        <ShopOutlined /> 供应商 - 生产汇总
      </h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div className="stat-card">
            <div className="stat-value">{CLASSES.length}</div>
            <div className="stat-label">班级总数</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <div className="stat-value">{confirmedClasses}/{CLASSES.length}</div>
            <div className="stat-label">已确认班级</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <div className="stat-value">{lockedClasses}/{CLASSES.length}</div>
            <div className="stat-label">已锁定班级</div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="stat-value">{totalStudents}人 / ¥{totalAmount}</div>
            <div className="stat-label">总订量 / 总金额</div>
          </div>
        </Col>
      </Row>

      <Alert
        message="生产说明"
        description="订单经家委会确认后，供应商可进行锁定操作。锁定后的订单进入生产流程，已提交学生的尺码信息不可修改，仅可补录遗漏的学生信息。"
        type="info"
        showIcon
        className="info-alert"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>
          班级订单状态
        </h3>
        <Button
          type="primary"
          icon={<LockOutlined />}
          onClick={handleLockAll}
          disabled={CLASSES.filter(c => isClassConfirmed(c.id) && !isClassLocked(c.id)).length === 0}
          danger
        >
          批量锁定已确认订单
        </Button>
      </div>

      <div className="table-container" style={{ marginBottom: 24 }}>
        <Table
          columns={classOrderColumns}
          dataSource={getClassOrderStatus()}
          rowKey="id"
          pagination={false}
          bordered
          size="middle"
        />
      </div>

      <Divider orientation="left">生产数量汇总</Divider>

      <Card
        title="尺码 × 类型 交叉汇总表"
        extra={<Tag color="blue">单位：套</Tag>}
        style={{ marginBottom: 16 }}
      >
        <div className="table-container">
          <Table
            columns={pivotColumns}
            dataSource={[...pivotData, totalRow]}
            pagination={false}
            bordered
            size="middle"
          />
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="按尺码汇总" size="small">
            <Row gutter={8}>
              {SIZES.map(size => (
                <Col span={8} key={size.id}>
                  <div style={{
                    background: sizeTotals[size.id] > 0
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#f5f5f5',
                    color: sizeTotals[size.id] > 0 ? 'white' : '#999',
                    padding: '16px 8px',
                    textAlign: 'center',
                    borderRadius: 8,
                    marginBottom: 8
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{sizeTotals[size.id]}</div>
                    <div style={{ fontSize: 12 }}>{size.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>{size.height}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="按类型汇总" size="small">
            <Row gutter={8}>
              {UNIFORM_TYPES.map(type => (
                <Col span={8} key={type.id}>
                  <div style={{
                    background: pivot[type.id].total > 0
                      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                      : '#f5f5f5',
                    color: pivot[type.id].total > 0 ? 'white' : '#999',
                    padding: '16px 8px',
                    textAlign: 'center',
                    borderRadius: 8,
                    marginBottom: 8
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{pivot[type.id].total}</div>
                    <div style={{ fontSize: 12 }}>{type.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>¥{type.price}/套</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title={`${getClassName(selectedClass)} - 订单详情`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="班级">{getClassName(selectedClass)}</Descriptions.Item>
          <Descriptions.Item label="提交人数">{classSummary.submitted} / {classSummary.total}</Descriptions.Item>
          <Descriptions.Item label="总金额">¥{classSummary.totalAmount}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            {isClassLocked(selectedClass)
              ? <Tag color="red">已锁定</Tag>
              : isClassConfirmed(selectedClass)
                ? <Tag color="green">已确认</Tag>
                : <Tag color="orange">待确认</Tag>
            }
          </Descriptions.Item>
        </Descriptions>

        <div className="table-container">
          <Table
            columns={detailColumns}
            dataSource={classStudents}
            rowKey="id"
            pagination={false}
            bordered
            size="small"
          />
        </div>

        <div className="summary-total">
          合计：{classStudents.length} 人，总金额 ¥{classSummary.totalAmount}
        </div>
      </Modal>
    </div>
  );
}
