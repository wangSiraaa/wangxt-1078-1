import React, { useState, useEffect } from 'react';
import { Tabs, Button, Modal, message } from 'antd';
import { UserOutlined, TeamOutlined, ShopOutlined, ReloadOutlined } from '@ant-design/icons';
import TeacherPage from './pages/TeacherPage';
import ParentCommitteePage from './pages/ParentCommitteePage';
import SupplierPage from './pages/SupplierPage';
import { initStorage, resetAllData } from './utils/storage';

const { TabPane } = Tabs;

export default function App() {
  const [activeKey, setActiveKey] = useState('teacher');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    initStorage();
  }, []);

  const handleReset = () => {
    Modal.confirm({
      title: '确认重置数据',
      content: '重置后所有数据将恢复到初始状态，此操作不可撤销。是否继续？',
      okText: '确认重置',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        resetAllData();
        setRefreshKey(prev => prev + 1);
        message.success('数据已重置');
      }
    });
  };

  const handleTabChange = (key) => {
    setActiveKey(key);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="app-header">
          <h1>🎽 校服订购尺码管理系统</h1>
          <p>服务班主任、家委会和供应商的一体化订购平台</p>
        </div>

        <div className="role-tabs">
          <Tabs
            activeKey={activeKey}
            onChange={handleTabChange}
            centered
            size="large"
            items={[
              {
                key: 'teacher',
                label: (
                  <span>
                    <UserOutlined /> 班主任
                  </span>
                )
              },
              {
                key: 'parent',
                label: (
                  <span>
                    <TeamOutlined /> 家委会
                  </span>
                )
              },
              {
                key: 'supplier',
                label: (
                  <span>
                    <ShopOutlined /> 供应商
                  </span>
                )
              }
            ]}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            danger
            size="small"
          >
            重置数据
          </Button>
        </div>

        <div className="content-card">
          {activeKey === 'teacher' && <TeacherPage key={refreshKey} />}
          {activeKey === 'parent' && <ParentCommitteePage key={refreshKey} />}
          {activeKey === 'supplier' && <SupplierPage key={refreshKey} />}
        </div>
      </div>
    </div>
  );
}
