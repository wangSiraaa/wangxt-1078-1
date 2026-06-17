export const CLASSES = [
  { id: 'class-1', name: '一年级(1)班', grade: '一年级' },
  { id: 'class-2', name: '一年级(2)班', grade: '一年级' },
  { id: 'class-3', name: '二年级(1)班', grade: '二年级' }
];

export const SIZES = [
  { id: '110', name: '110码', height: '105-115cm' },
  { id: '120', name: '120码', height: '115-125cm' },
  { id: '130', name: '130码', height: '125-135cm' },
  { id: '140', name: '140码', height: '135-145cm' },
  { id: '150', name: '150码', height: '145-155cm' },
  { id: '160', name: '160码', height: '155-165cm' },
  { id: '170', name: '170码', height: '165-175cm' }
];

export const SEASONS = [
  { id: 'autumn', name: '秋装', price: 120, icon: '🍂' },
  { id: 'winter', name: '冬装', price: 200, icon: '❄️' }
];

export const UNIFORM_TYPES = SEASONS;

export const STATUS_MAP = {
  draft: { label: '试穿稿', color: 'default' },
  pending_review: { label: '待复核', color: 'warning' },
  submitted: { label: '已提交', color: 'success' },
  supplementary: { label: '已补录', color: 'purple' },
  pending: { label: '待提交', color: 'orange' }
};

export const initialStudents = [
  {
    id: 's1', classId: 'class-1', name: '张三', studentNo: '20240101',
    orders: {
      autumn: {
        size: '130', status: 'submitted', submittedAt: '2024-09-01 10:30',
        updatedAt: '2024-09-01 10:30', isSupplementary: false,
        batchId: 'normal-class-1-autumn'
      },
      winter: {
        size: '140', status: 'draft', submittedAt: null,
        updatedAt: '2024-09-05 15:00', isSupplementary: false
      }
    }
  },
  {
    id: 's2', classId: 'class-1', name: '李四', studentNo: '20240102',
    orders: {
      autumn: {
        size: '120', status: 'submitted', submittedAt: '2024-09-01 11:00',
        updatedAt: '2024-09-01 11:00', isSupplementary: false,
        batchId: 'normal-class-1-autumn'
      },
      winter: {
        size: null, status: 'pending', submittedAt: null,
        updatedAt: null, isSupplementary: false
      }
    }
  },
  {
    id: 's3', classId: 'class-1', name: '王五', studentNo: '20240103',
    orders: {
      autumn: {
        size: '120', status: 'pending_review', submittedAt: '2024-09-01 12:00',
        updatedAt: '2024-09-02 09:30', isSupplementary: false,
        pendingSize: '130'
      },
      winter: {
        size: null, status: 'pending', submittedAt: null,
        updatedAt: null, isSupplementary: false
      }
    }
  },
  {
    id: 's8', classId: 'class-1', name: '郑十', studentNo: '20240104',
    orders: {
      autumn: {
        size: '130', status: 'pending_review', submittedAt: '2024-08-31 16:00',
        updatedAt: '2024-09-01 14:20', isSupplementary: false,
        fromClass: 'class-2', pendingToClass: 'class-1'
      },
      winter: {
        size: '140', status: 'submitted', submittedAt: '2024-09-01 16:00',
        updatedAt: '2024-09-01 16:00', isSupplementary: false,
        batchId: 'normal-class-1-winter'
      }
    }
  },
  {
    id: 's9', classId: 'class-1', name: '吴十一', studentNo: '20240105',
    orders: {
      autumn: {
        size: '150', status: 'submitted', submittedAt: '2024-09-04 10:00',
        updatedAt: '2024-09-04 10:00', isSupplementary: true,
        supplementaryAt: '2024-09-04 10:00',
        batchId: 'supp-postlock-1693795200'
      },
      winter: {
        size: null, status: 'pending', submittedAt: null,
        updatedAt: null, isSupplementary: false
      }
    }
  },
  {
    id: 's4', classId: 'class-2', name: '赵六', studentNo: '20240201',
    orders: {
      autumn: {
        size: '140', status: 'submitted', submittedAt: '2024-09-02 09:00',
        updatedAt: '2024-09-02 09:00', isSupplementary: false,
        batchId: 'normal-class-2-autumn'
      },
      winter: {
        size: '150', status: 'submitted', submittedAt: '2024-09-02 09:00',
        updatedAt: '2024-09-02 09:00', isSupplementary: false,
        batchId: 'normal-class-2-winter'
      }
    }
  },
  {
    id: 's2_dup', classId: 'class-2', name: '李四', studentNo: '20240102',
    orders: {
      autumn: {
        size: '130', status: 'submitted', submittedAt: '2024-09-03 10:00',
        updatedAt: '2024-09-03 10:00', isSupplementary: false,
        batchId: 'normal-class-2-autumn'
      },
      winter: {
        size: null, status: 'pending', submittedAt: null,
        updatedAt: null, isSupplementary: false
      }
    }
  },
  {
    id: 's5', classId: 'class-2', name: '钱七', studentNo: '20240202',
    orders: {
      autumn: {
        size: null, status: 'pending', submittedAt: null,
        updatedAt: null, isSupplementary: false
      },
      winter: {
        size: null, status: 'pending', submittedAt: null,
        updatedAt: null, isSupplementary: false
      }
    }
  },
  {
    id: 's10', classId: 'class-2', name: '冯十二', studentNo: '20240203',
    orders: {
      autumn: {
        size: '140', status: 'submitted', submittedAt: '2024-09-03 11:30',
        updatedAt: '2024-09-03 11:30', isSupplementary: false,
        batchId: 'normal-class-2-autumn'
      },
      winter: {
        size: '150', status: 'draft', submittedAt: null,
        updatedAt: '2024-09-10 14:00', isSupplementary: false
      }
    }
  },
  {
    id: 's6', classId: 'class-3', name: '孙八', studentNo: '20230101',
    orders: {
      autumn: {
        size: '150', status: 'submitted', submittedAt: '2024-09-01 14:00',
        updatedAt: '2024-09-01 14:00', isSupplementary: false,
        batchId: 'normal-class-3-autumn'
      },
      winter: {
        size: '160', status: 'submitted', submittedAt: '2024-09-01 14:00',
        updatedAt: '2024-09-01 14:00', isSupplementary: false,
        batchId: 'normal-class-3-winter'
      }
    }
  },
  {
    id: 's7', classId: 'class-3', name: '周九', studentNo: '20230102',
    orders: {
      autumn: {
        size: '160', status: 'submitted', submittedAt: '2024-09-02 10:00',
        updatedAt: '2024-09-02 10:00', isSupplementary: false,
        batchId: 'normal-class-3-autumn'
      },
      winter: {
        size: null, status: 'draft', submittedAt: null,
        updatedAt: '2024-09-06 11:00', isSupplementary: false
      }
    }
  },
  {
    id: 's11', classId: 'class-3', name: '陈十三', studentNo: '20230103',
    orders: {
      autumn: {
        size: '150', status: 'submitted', submittedAt: '2024-09-05 09:30',
        updatedAt: '2024-09-05 09:30', isSupplementary: true,
        supplementaryAt: '2024-09-05 09:30',
        batchId: 'supp-prelock-1693881600'
      },
      winter: {
        size: '160', status: 'submitted', submittedAt: '2024-09-06 10:00',
        updatedAt: '2024-09-06 10:00', isSupplementary: false,
        batchId: 'normal-class-3-winter'
      }
    }
  }
];

export const initialOrderStatus = {
  'class-1': {
    autumn: { confirmed: false, locked: false, confirmedAt: null, lockedAt: null, deadline: '2024-09-15' },
    winter: { confirmed: false, locked: false, confirmedAt: null, lockedAt: null, deadline: '2024-10-15' }
  },
  'class-2': {
    autumn: { confirmed: true, locked: false, confirmedAt: '2024-09-03 09:00', lockedAt: null, deadline: '2024-09-15' },
    winter: { confirmed: false, locked: false, confirmedAt: null, lockedAt: null, deadline: '2024-10-15' }
  },
  'class-3': {
    autumn: { confirmed: true, locked: true, confirmedAt: '2024-09-02 16:00', lockedAt: '2024-09-04 10:00', deadline: '2024-09-15' },
    winter: { confirmed: true, locked: false, confirmedAt: '2024-09-05 10:00', lockedAt: null, deadline: '2024-10-15' }
  }
};

export const initialChangeLogs = [
  {
    id: 'log1', studentId: 's1', type: 'submit', season: 'autumn',
    detail: '班主任提交秋装尺码 130', operator: '班主任', timestamp: '2024-09-01 10:30'
  },
  {
    id: 'log2', studentId: 's2', type: 'submit', season: 'autumn',
    detail: '班主任提交秋装尺码 120', operator: '班主任', timestamp: '2024-09-01 11:00'
  },
  {
    id: 'log3', studentId: 's4', type: 'submit', season: 'autumn',
    detail: '班主任提交秋装尺码 140', operator: '班主任', timestamp: '2024-09-02 09:00'
  },
  {
    id: 'log4', studentId: 's3', type: 'draft', season: 'autumn',
    detail: '班主任录入试穿稿：120', operator: '班主任', timestamp: '2024-08-31 14:00'
  },
  {
    id: 'log5', studentId: 's3', type: 'conflict', season: 'autumn',
    detail: '尺码冲突（申请130），转待复核', operator: '系统', timestamp: '2024-09-02 09:30'
  },
  {
    id: 'log6', studentId: 's8', type: 'class_change', season: 'autumn',
    detail: '学生从 一年级(2)班 转入，待复核', operator: '系统', timestamp: '2024-09-01 14:20'
  },
  {
    id: 'log7', studentId: 's8', type: 'submit', season: 'winter',
    detail: '班主任提交冬装尺码 140', operator: '班主任', timestamp: '2024-09-01 16:00'
  },
  {
    id: 'log8', studentId: 's9', type: 'supplementary_submit', season: 'autumn',
    detail: '锁单后补录秋装尺码 150（缺码补单）', operator: '班主任', timestamp: '2024-09-04 10:00'
  },
  {
    id: 'log9', studentId: 's11', type: 'supplementary_submit', season: 'autumn',
    detail: '锁单前补录秋装尺码 150', operator: '班主任', timestamp: '2024-09-05 09:30'
  },
  {
    id: 'log10', studentId: 's6', type: 'submit', season: 'autumn',
    detail: '班主任提交秋装尺码 150', operator: '班主任', timestamp: '2024-09-01 14:00'
  },
  {
    id: 'log11', studentId: 's7', type: 'submit', season: 'autumn',
    detail: '班主任提交秋装尺码 160', operator: '班主任', timestamp: '2024-09-02 10:00'
  },
  {
    id: 'log12', studentId: 'class-3', type: 'confirm', season: 'autumn',
    detail: '家委会确认秋装订单（15人）', operator: '家委会', timestamp: '2024-09-02 16:00'
  },
  {
    id: 'log13', studentId: 'class-3', type: 'lock', season: 'autumn',
    detail: '供应商锁定秋装订单，开始生产', operator: '供应商', timestamp: '2024-09-04 10:00'
  },
  {
    id: 'log14', studentId: 'class-2', type: 'confirm', season: 'autumn',
    detail: '家委会确认秋装订单', operator: '家委会', timestamp: '2024-09-03 09:00'
  },
  {
    id: 'log15', studentId: 'class-3', type: 'confirm', season: 'winter',
    detail: '家委会确认冬装订单', operator: '家委会', timestamp: '2024-09-05 10:00'
  }
];
