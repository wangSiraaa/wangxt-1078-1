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

export const UNIFORM_TYPES = [
  { id: 'summer', name: '夏装', price: 80 },
  { id: 'autumn', name: '秋装', price: 120 },
  { id: 'winter', name: '冬装', price: 200 }
];

export const initialStudents = [
  { id: 's1', classId: 'class-1', name: '张三', studentNo: '20240101', size: '130', types: ['summer', 'autumn'], submittedAt: '2024-09-01 10:30', status: 'submitted' },
  { id: 's2', classId: 'class-1', name: '李四', studentNo: '20240102', size: '120', types: ['summer'], submittedAt: '2024-09-01 11:00', status: 'submitted' },
  { id: 's3', classId: 'class-1', name: '王五', studentNo: '20240103', size: null, types: [], submittedAt: null, status: 'pending' },
  { id: 's4', classId: 'class-2', name: '赵六', studentNo: '20240201', size: '140', types: ['summer', 'autumn', 'winter'], submittedAt: '2024-09-02 09:00', status: 'submitted' },
  { id: 's5', classId: 'class-2', name: '钱七', studentNo: '20240202', size: null, types: [], submittedAt: null, status: 'pending' },
  { id: 's6', classId: 'class-3', name: '孙八', studentNo: '20230101', size: '150', types: ['autumn', 'winter'], submittedAt: '2024-09-01 14:00', status: 'submitted' },
  { id: 's7', classId: 'class-3', name: '周九', studentNo: '20230102', size: '160', types: ['summer'], submittedAt: '2024-09-02 10:00', status: 'submitted' }
];

export const initialOrderStatus = {
  'class-1': { confirmed: false, locked: false, confirmedAt: null, lockedAt: null },
  'class-2': { confirmed: true, locked: false, confirmedAt: '2024-09-03 09:00', lockedAt: null },
  'class-3': { confirmed: true, locked: true, confirmedAt: '2024-09-02 16:00', lockedAt: '2024-09-04 10:00' }
};
