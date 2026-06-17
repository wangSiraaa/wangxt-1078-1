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
  Divider,
  Tabs,
  Empty
} from 'antd';
import {
  ShopOutlined,
  CheckCircleOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  LockFilled,
  ClockCircleOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { CLASSES, UNIFORM_TYPES, SIZES, SEASONS } from '../data/mockData';
import {
  getProductionSummaryByStatus,
  getStudents,
  getClassSeasonStatus,
  isClassSeasonLocked,
  isClassSeasonConfirmed,
  lockClassSeasonOrder,
  getClassName,
  getSizeName,
  getSeasonName,
  getSeasonPrice,
  getClassSeasonSummary,
  getSeasonClassBatches,
  getSizeSummaryBySeasonAndStatus
} from '../utils/storage';

const { Option } = Select;
const { TabPane } = Tabs;

export default function SupplierPage() {
  const [productionData, setProductionData] = useState({ confirmed: [], pending_lock: [], supplementary: [] });
  const [allStudents, setAllStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedTab, setSelectedTab] = useState('pending_lock');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailBatch, setDetailBatch] = useState(null);
  const [detailStudents, setDetailStudents] = useState([]);

  const loadData = () => {
    setProductionData(getProductionSummaryByStatus());
    setAllStudents(getStudents());
    setBatches(getSeasonClassBatches());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLockOrder = (classId, season, batchType = 'normal') => {
    const classInfo = CLASSES.find(c => c.id === classId);
    if (batchType === 'supplementary') {
      message.info('补录批次不需要锁定，将自动进入生产队列');
      return;
    }
    if (!isClassSeasonConfirmed(classId, season)) {
      message.error('该班级该季节订单尚未经过家委会确认，无法锁定');
      return;
    }
    if (isClassSeasonLocked(classId, season)) {
      message.warning('该班级该季节订单已锁定');
      return;
    }

    Modal.confirm({
      title: `锁定${getSeasonName(season)}订单`,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>您即将锁定 <strong>{classInfo?.name}</strong> 的 <strong>{getSeasonName(season)}</strong> 校服订单。</p>
          <p style={{ marginBottom: 0 }}>锁定后：</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            <li>订单将进入生产流程，不可撤销</li>
            <li>已提交的学生尺码信息不可修改</li>
            <li>如后续发现缺码，仅允许新增补单，不允许修改原尺码</li>
          </ul>
        </div>
      ),
      okText: '确认锁定',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        lockClassSeasonOrder(classId, season);
        message.success(`${getSeasonName(season)}订单已锁定，可以开始生产`);
        loadData();
      }
    });
  };

  const handleLockAllConfirmed = () => {
    const toLock = batches.filter(
      b => b.status === 'pending_lock'
        && b.batchType === 'normal'
        && (selectedSeason === 'all' || b.season === selectedSeason)
    );

    if (toLock.length === 0) {
      message.warning('没有可锁定的订单');
      return;
    }

    Modal.confirm({
      title: '批量锁定订单',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>您即将锁定以下 {toLock.length} 个正常批次（补录批次自动处理）：</p>
          <ul style={{ marginLeft: 20, marginTop: 8 }}>
            {toLock.map(b => (
              <li key={b.id}>{b.className} - {b.seasonName}</li>
            ))}
          </ul>
        </div>
      ),
      okText: '确认全部锁定',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const done = new Set();
        toLock.forEach(b => {
          const key = `${b.classId}-${b.season}`;
          if (!done.has(key)) {
            lockClassSeasonOrder(b.classId, b.season);
            done.add(key);
          }
        });
        message.success(`已锁定 ${done.size} 个班级的季节订单`);
        loadData();
      }
    });
  };

  const handleViewBatchDetail = (batch) => {
    setDetailBatch(batch);
    const batchStudents = allStudents.filter(s => {
      const order = s.orders && s.orders[batch.season];
      if (!order || !order.size) return false;

      if (batch.batchType === 'normal') {
        return s.classId === batch.classId && !order.isSupplementary && order.status !== 'pending_review';
      } else if (batch.batchType === 'supplementary') {
        return s.classId === batch.classId && order.isSupplementary === true;
      }
      return false;
    });
    setDetailStudents(batchStudents);
    setDetailModalVisible(true);
  };

  const getBatchData = () => {
    let filtered = batches;
    if (selectedSeason !== 'all') {
      filtered = filtered.filter(b => b.season === selectedSeason);
    }

    if (selectedTab === 'confirmed') {
      return filtered.filter(b => b.status === 'confirmed' && b.batchType === 'normal');
    } else if (selectedTab === 'pending_lock') {
      return filtered.filter(b => b.status === 'pending_lock' && b.batchType === 'normal');
    } else if (selectedTab === 'supplementary') {
      return filtered.filter(b => b.batchType === 'supplementary');
    }
    return [];
  };

  const getPivotData = (statusList) => {
    const pivot = {};
    const sizes = SIZES.map(s => s.id);

    SEASONS.forEach(season => {
      pivot[season.id] = {};
      sizes.forEach(size => {
        pivot[season.id][size] = 0;
      });
      pivot[season.id].total = 0;
    });

    const filterStudents = allStudents.filter(s => {
      let included = false;
      SEASONS.forEach(season => {
        const order = s.orders && s.orders[season.id];
        if (order && order.size && statusList.includes(order.status)) {
          if (selectedSeason === 'all' || selectedSeason === season.id) {
            included = true;
            pivot[season.id][order.size] += 1;
            pivot[season.id].total += 1;
          }
        }
      });
      return included;
    });

    const sizeTotals = {};
    sizes.forEach(size => {
      sizeTotals[size] = SEASONS.reduce((sum, season) => {
        if (selectedSeason === 'all' || selectedSeason === season.id) {
          return sum + pivot[season.id][size];
        }
        return sum;
      }, 0);
    });

    return { pivot, sizeTotals, totalCount: filterStudents.length };
  };

  const batchColumns = [
    {
      title: '批次类型',
      key: 'batchType',
      width: 110,
      align: 'center',
      render: (_, record) => (
        record.batchType === 'supplementary'
          ? <Tag color="purple" icon={<PlusOutlined />}>补录批次</Tag>
          : <Tag color="blue">正常批次</Tag>
      )
    },
    {
      title: '班级',
      dataIndex: 'className',
      key: 'className',
      width: 140
    },
    {
      title: '季节',
      key: 'season',
      width: 100,
      render: (_, record) => (
        <span>{record.seasonIcon} {record.seasonName}</span>
      )
    },
    {
      title: '提交人数',
      dataIndex: 'submitted',
      key: 'submitted',
      width: 100,
      align: 'center'
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
      key: 'confirmed',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.batchType === 'supplementary') {
          return <Tag icon={<CheckCircleOutlined />} color="default">自动生效</Tag>;
        }
        return record.confirmed
          ? <Tag icon={<CheckCircleOutlined />} color="success">已确认</Tag>
          : <Tag icon={<ExclamationCircleOutlined />} color="warning">待确认</Tag>;
      }
    },
    {
      title: '确认时间',
      dataIndex: 'confirmedAt',
      key: 'confirmedAt',
      width: 180,
      render: (v, r) => r.batchType === 'supplementary' ? '-' : (v || '-')
    },
    {
      title: '锁定状态',
      key: 'locked',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.batchType === 'supplementary') {
          return <Tag icon={<ShopOutlined />} color="purple">待生产</Tag>;
        }
        return record.locked
          ? <Tag icon={<LockOutlined />} color="error">已锁定</Tag>
          : <Tag icon={<ClockCircleOutlined />} color="default">待锁单</Tag>;
      }
    },
    {
      title: '锁定时间',
      dataIndex: 'lockedAt',
      key: 'lockedAt',
      width: 180,
      render: (v, r) => r.batchType === 'supplementary' ? '-' : (v || '-')
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 130,
      render: (v) => v || '-'
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
            onClick={() => handleViewBatchDetail(record)}
          >
            详情
          </Button>
          {record.batchType === 'normal' && (
            <Button
              type="link"
              icon={<LockFilled />}
              onClick={() => handleLockOrder(record.classId, record.season, record.batchType)}
              disabled={!record.confirmed || record.locked}
              danger
            >
              锁定
            </Button>
          )}
        </Space>
      )
    }
  ];

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
      key: 'size',
      width: 120,
      render: (_, record) => {
        const order = record.orders && record.orders[detailBatch?.season];
        return order && order.size ? getSizeName(order.size) : '-';
      }
    },
    {
      title: '订单类型',
      key: 'type',
      width: 120,
      render: (_, record) => {
        const order = record.orders && record.orders[detailBatch?.season];
        return order && order.isSupplementary
          ? <Tag color="purple" icon={<PlusOutlined />}>补录订单</Tag>
          : <Tag color="blue">正常订单</Tag>;
      }
    },
    {
      title: '金额',
      key: 'amount',
      width: 100,
      render: (_, record) => {
        const order = record.orders && record.orders[detailBatch?.season];
        return order && order.size ? `¥${detailBatch ? getSeasonPrice(detailBatch.season) : 0}` : '-';
      }
    },
    {
      title: '提交时间',
      key: 'submittedAt',
      width: 180,
      render: (_, record) => {
        const order = record.orders && record.orders[detailBatch?.season];
        return order && (order.submittedAt || order.updatedAt) || '-';
      }
    }
  ];

  const confirmedCount = batches.filter(
    b => b.status === 'confirmed' && b.batchType === 'normal' && (selectedSeason === 'all' || b.season === selectedSeason)
  ).length;
  const pendingCount = batches.filter(
    b => b.status === 'pending_lock' && b.batchType === 'normal' && (selectedSeason === 'all' || b.season === selectedSeason)
  ).length;
  const supplementaryCount = batches.filter(
    b => b.batchType === 'supplementary' && (selectedSeason === 'all' || b.season === selectedSeason)
  ).length;
  const lockedClasses = batches.filter(
    b => b.batchType === 'normal' && b.locked && (selectedSeason === 'all' || b.season === selectedSeason)
  );
  const confirmedClasses = batches.filter(
    b => b.batchType === 'normal' && b.confirmed && (selectedSeason === 'all' || b.season === selectedSeason)
  );
  const totalStudentsByTab = () => {
    const data = getBatchData();
    return data.reduce((sum, b) => sum + (b.submitted || 0), 0);
  };
  const totalAmountByTab = () => {
    const data = getBatchData();
    return data.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  };

  const renderSummaryCards = (statusList, batchType = 'normal') => {
    const { pivot } = getPivotData(statusList);
    const visibleSeasons = selectedSeason === 'all' ? SEASONS : SEASONS.filter(s => s.id === selectedSeason);

    return (
      <Row gutter={16}>
        {visibleSeasons.map(season => {
          const seasonBatches = batches.filter(
            b => b.season === season.id && b.batchType === batchType
          );
          const submitted = seasonBatches.reduce((s, b) => s + (b.submitted || 0), 0);
          return (
            <Col span={Math.floor(24 / visibleSeasons.length)} key={season.id}>
              <Card
                title={
                  <span>
                    {season.icon} {season.name} 尺码汇总
                    {batchType === 'supplementary' && <Tag color="purple" style={{ marginLeft: 8 }}>补录</Tag>}
                  </span>
                }
                size="small"
                extra={<Tag color="blue">共{pivot[season.id].total || submitted}套</Tag>}
                style={{ marginBottom: 16 }}
              >
                <Row gutter={8}>
                  {SIZES.map(size => (
                    <Col span={Math.floor(24 / SIZES.length)} key={size.id}>
                      <div style={{
                        background: pivot[season.id][size.id] > 0
                          ? (batchType === 'supplementary'
                              ? 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
                          : '#f5f5f5',
                        color: pivot[season.id][size.id] > 0 ? 'white' : '#999',
                        padding: '12px 4px',
                        textAlign: 'center',
                        borderRadius: 8,
                        marginBottom: 8
                      }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{pivot[season.id][size.id]}</div>
                        <div style={{ fontSize: 12 }}>{size.name}</div>
                        <div style={{ fontSize: 10, opacity: 0.8 }}>{size.height}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <div>
      <h2 className="page-title">
        <ShopOutlined /> 供应商 - 生产汇总
      </h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <div className="stat-value">{confirmedClasses.length}</div>
            <div className="stat-label">已确认批次</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <div className="stat-value">{lockedClasses.length}</div>
            <div className="stat-label">已锁定批次</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }}>
            <div className="stat-value">{productionData.supplementary.length}</div>
            <div className="stat-label">补录订单数</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="stat-value">{totalStudentsByTab()}人</div>
            <div className="stat-label">当前批次人数</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <div className="stat-value">¥{totalAmountByTab()}</div>
            <div className="stat-label">当前批次金额</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card">
            <div className="stat-value">{allStudents.length}</div>
            <div className="stat-label">学生总数</div>
          </div>
        </Col>
      </Row>

      <Alert
        message="生产说明"
        description={
          <div>
            <p><strong>已确认批次</strong>：家委会已确认且供应商已锁定，可直接安排生产，不可修改。</p>
            <p style={{ marginBottom: 0 }}><strong>待锁单批次</strong>：家委会已确认但供应商尚未锁定，锁定后进入生产。</p>
            <p style={{ marginBottom: 0 }}><strong>补录批次</strong>：锁单后发现缺码而新增的补单，单独统计，不影响原订单。</p>
          </div>
        }
        type="info"
        showIcon
        className="info-alert"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 500 }}>季节筛选：</span>
          <Select
            value={selectedSeason}
            onChange={setSelectedSeason}
            style={{ width: 160 }}
          >
            <Option value="all">全部季节</Option>
            {SEASONS.map(s => (
              <Option key={s.id} value={s.id}>{s.icon} {s.name}</Option>
            ))}
          </Select>
        </div>
        <Button
          type="primary"
          icon={<LockOutlined />}
          onClick={handleLockAllConfirmed}
          disabled={pendingCount === 0}
          danger
        >
          批量锁定待锁单批次（{pendingCount}）
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs activeKey={selectedTab} onChange={setSelectedTab}>
          <TabPane
            tab={
              <span>
                <CheckCircleOutlined /> 已确认（{confirmedCount}）
              </span>
            }
            key="confirmed"
          />
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined /> 待锁单（{pendingCount}）
              </span>
            }
            key="pending_lock"
          />
          <TabPane
            tab={
              <span>
                <PlusOutlined /> 已补录（{supplementaryCount}）
              </span>
            }
            key="supplementary"
          />
        </Tabs>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>
          {selectedTab === 'confirmed' && '已确认并锁定 - 生产中批次'}
          {selectedTab === 'pending_lock' && '待锁单批次 - 确认后待锁定'}
          {selectedTab === 'supplementary' && '已补录批次 - 锁单后新增'}
        </h3>
      </div>

      <div className="table-container" style={{ marginBottom: 16 }}>
        {getBatchData().length > 0 ? (
          <Table
            columns={batchColumns}
            dataSource={getBatchData()}
            rowKey="id"
            pagination={false}
            bordered
            size="middle"
          />
        ) : (
          <Empty
            description={
              selectedTab === 'confirmed' ? '暂无已锁定的生产批次'
                : selectedTab === 'pending_lock' ? '暂无待锁单批次'
                : '暂无补录订单'
            }
            style={{ padding: '40px 0' }}
          />
        )}
      </div>

      {selectedTab === 'confirmed' && renderSummaryCards(['submitted'], 'normal')}
      {selectedTab === 'pending_lock' && renderSummaryCards(['submitted'], 'normal')}
      {selectedTab === 'supplementary' && renderSummaryCards(['submitted', 'supplementary'], 'supplementary')}

      <Divider orientation="left">各季节整体汇总</Divider>

      <Row gutter={16}>
        {SEASONS.map(season => {
          const lockedSummary = getSizeSummaryBySeasonAndStatus(season.id, ['submitted']);
          const suppSummary = getSizeSummaryBySeasonAndStatus(season.id, ['supplementary']);
          const seasonBatches = batches.filter(b => b.season === season.id);
          const lockedBatches = seasonBatches.filter(b => b.locked).length;

          return (
            <Col span={12} key={season.id}>
              <Card
                title={`${season.icon} ${season.name} 整体汇总`}
                size="small"
                extra={
                  <Space>
                    <Tag color="green">已锁定{lockedBatches}/{seasonBatches.length}</Tag>
                    <Tag color="blue">¥{getSeasonPrice(season.id)}/套</Tag>
                  </Space>
                }
              >
                <Row gutter={8}>
                  {SIZES.map(size => {
                    const locked = lockedSummary.find(s => s.id === size.id)?.count || 0;
                    const supp = suppSummary.find(s => s.id === size.id)?.count || 0;
                    const total = locked + supp;
                    return (
                      <Col span={Math.floor(24 / SIZES.length)} key={size.id}>
                        <div style={{
                          background: total > 0
                            ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                            : '#f5f5f5',
                          color: total > 0 ? 'white' : '#999',
                          padding: '10px 4px',
                          textAlign: 'center',
                          borderRadius: 6,
                          marginBottom: 6
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{total}</div>
                          <div style={{ fontSize: 11 }}>{size.name}</div>
                          {supp > 0 && (
                            <div style={{ fontSize: 10, opacity: 0.9 }}>含补录{supp}</div>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal
        title={detailBatch ? `${detailBatch.className} - ${detailBatch.seasonName} 批次详情` : '批次详情'}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {detailBatch && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="批次类型">
                {detailBatch.batchType === 'supplementary'
                  ? <Tag color="purple" icon={<PlusOutlined />}>补录批次</Tag>
                  : <Tag color="blue">正常批次</Tag>
                }
              </Descriptions.Item>
              <Descriptions.Item label="班级">{detailBatch.className}</Descriptions.Item>
              <Descriptions.Item label="季节">{detailBatch.seasonIcon} {detailBatch.seasonName}</Descriptions.Item>
              <Descriptions.Item label="提交人数">{detailBatch.submitted}人</Descriptions.Item>
              <Descriptions.Item label="总金额">¥{detailBatch.totalAmount}</Descriptions.Item>
              <Descriptions.Item label="确认状态">
                {detailBatch.batchType === 'supplementary'
                  ? <Tag color="default">自动生效</Tag>
                  : (detailBatch.confirmed ? <Tag color="success">已确认</Tag> : <Tag color="warning">待确认</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="锁定状态">
                {detailBatch.batchType === 'supplementary'
                  ? <Tag color="purple" icon={<ShopOutlined />}>待生产</Tag>
                  : (detailBatch.locked ? <Tag color="error">已锁定</Tag> : <Tag color="default">待锁单</Tag>)}
              </Descriptions.Item>
              <Descriptions.Item label="确认时间">{detailBatch.batchType === 'supplementary' ? '-' : (detailBatch.confirmedAt || '-')}</Descriptions.Item>
              <Descriptions.Item label="锁定时间">{detailBatch.batchType === 'supplementary' ? '-' : (detailBatch.lockedAt || '-')}</Descriptions.Item>
              <Descriptions.Item label="截止时间" span={2}>{detailBatch.deadline || '-'}</Descriptions.Item>
              <Descriptions.Item label="批次ID" span={2}>
                <span style={{ color: '#999' }}>{detailBatch.id}</span>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">学生明细（{detailStudents.length}人）</Divider>
            <div className="table-container">
              {detailStudents.length > 0 ? (
                <Table
                  columns={detailColumns}
                  dataSource={detailStudents}
                  rowKey="id"
                  pagination={false}
                  bordered
                  size="small"
                />
              ) : (
                <Empty description="暂无学生数据" style={{ padding: '20px 0' }} />
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
