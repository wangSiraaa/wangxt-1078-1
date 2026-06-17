import React, { useState, useEffect } from 'react';
import {
  Select,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Checkbox,
  Tag,
  Alert,
  message,
  Row,
  Col,
  Card
} from 'antd';
import {
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LockOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  UserOutlined
} from '@ant-design/icons';
import { CLASSES, SIZES, UNIFORM_TYPES } from '../data/mockData';
import {
  getStudentsByClass,
  saveStudent,
  isClassLocked,
  isClassConfirmed,
  getClassSummary,
  getSizeName,
  getTypeName,
  calculateAmount,
  hasStudentSubmitted
} from '../utils/storage';

const { Option } = Select;

export default function TeacherPage() {
  const [selectedClass, setSelectedClass] = useState(CLASSES[0].id);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, submitted: 0, pending: 0, totalAmount: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form] = Form.useForm();

  const loadData = () => {
    const classStudents = getStudentsByClass(selectedClass);
    setStudents(classStudents);
    setSummary(getClassSummary(selectedClass));
    setIsLocked(isClassLocked(selectedClass));
    setIsConfirmed(isClassConfirmed(selectedClass));
  };

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const handleClassChange = (value) => {
    setSelectedClass(value);
  };

  const handleEdit = (student) => {
    if (isLocked && hasStudentSubmitted(student.id)) {
      message.error('订单已锁定，已提交的学生尺码不能修改，仅可补录未提交的学生');
      return;
    }
    if (hasStudentSubmitted(student.id)) {
      message.warning('该学生已提交，如需修改请联系家委会取消确认');
      return;
    }
    setEditingStudent(student);
    form.setFieldsValue({
      name: student.name,
      studentNo: student.studentNo,
      size: student.size,
      types: student.types || []
    });
    setEditModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.size) {
        message.error('请选择尺码');
        return;
      }
      if (!values.types || values.types.length === 0) {
        message.error('请选择至少一种校服类型');
        return;
      }

      const updatedStudent = {
        ...editingStudent,
        size: values.size,
        types: values.types,
        status: 'submitted',
        submittedAt: new Date().toLocaleString('zh-CN')
      };

      saveStudent(updatedStudent);
      message.success('尺码信息提交成功');
      setEditModalVisible(false);
      loadData();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleAddStudent = () => {
    if (isLocked) {
      message.error('订单已锁定，不能添加新学生');
      return;
    }
    const newId = `s${Date.now()}`;
    setEditingStudent({
      id: newId,
      classId: selectedClass,
      name: '',
      studentNo: '',
      size: null,
      types: [],
      submittedAt: null,
      status: 'pending'
    });
    form.resetFields();
    setEditModalVisible(true);
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
      render: (size) => size ? getSizeName(size) : <Tag color="orange">未选择</Tag>
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
            : <Tag color="orange">未选择</Tag>
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
          : <Tag icon={<ClockCircleOutlined />} color="warning">待提交</Tag>
      )
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
          disabled={isLocked && record.status === 'submitted'}
        >
          {record.status === 'submitted' ? '查看' : '编辑'}
        </Button>
      )
    }
  ];

  const statusDescription = () => {
    if (isLocked) {
      return (
        <Alert
          message="订单已锁定"
          description="订单已锁定并提交给供应商，已提交的学生尺码不能修改，仅可补录未提交的学生信息。"
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
          description="家委会已确认班级订单，学生尺码信息已不可修改。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="info-alert"
        />
      );
    }
    return null;
  };

  return (
    <div>
      <h2 className="page-title">
        <UserOutlined /> 班主任 - 学生尺码收集
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
          {isConfirmed && <Tag color="blue">已确认</Tag>}
          {isLocked && <Tag color="red">已锁定</Tag>}
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddStudent}
          disabled={isLocked}
        >
          添加学生
        </Button>
      </div>

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
          <span style={{ color: '#faad14', marginLeft: 12 }}>
            （还有 {summary.pending} 人未提交）
          </span>
        )}
      </div>

      <Modal
        title={editingStudent && editingStudent.name ? '编辑学生尺码' : '添加学生'}
        open={editModalVisible}
        onOk={handleSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="提交"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="学生姓名"
            rules={[{ required: true, message: '请输入学生姓名' }]}
          >
            <Input placeholder="请输入学生姓名" disabled={editingStudent && editingStudent.name} />
          </Form.Item>
          <Form.Item
            name="studentNo"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input placeholder="请输入学号" disabled={editingStudent && editingStudent.studentNo} />
          </Form.Item>
          <Form.Item
            name="size"
            label="选择尺码"
            rules={[{ required: true, message: '请选择尺码' }]}
          >
            <Select placeholder="请选择尺码">
              {SIZES.map(size => (
                <Option key={size.id} value={size.id}>
                  {size.name} ({size.height})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="types"
            label="选择校服类型"
            rules={[{ required: true, message: '请选择至少一种校服类型' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row>
                {UNIFORM_TYPES.map(type => (
                  <Col span={8} key={type.id}>
                    <Checkbox value={type.id}>
                      {type.name} (¥{type.price})
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item label="预估金额">
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff' }}>
              ¥{form.getFieldValue('types') ? calculateAmount(form.getFieldValue('types')) : 0}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
