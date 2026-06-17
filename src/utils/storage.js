import { CLASSES, SIZES, UNIFORM_TYPES, initialStudents, initialOrderStatus } from '../data/mockData';

export const STORAGE_KEYS = {
  STUDENTS: 'uniform_students',
  ORDER_STATUS: 'uniform_order_status',
  INITIALIZED: 'uniform_initialized'
};

export function initStorage() {
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!initialized) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
    localStorage.setItem(STORAGE_KEYS.ORDER_STATUS, JSON.stringify(initialOrderStatus));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
}

export function getStudents() {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  return data ? JSON.parse(data) : [];
}

export function saveStudents(students) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function getOrderStatus() {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.ORDER_STATUS);
  return data ? JSON.parse(data) : {};
}

export function saveOrderStatus(status) {
  localStorage.setItem(STORAGE_KEYS.ORDER_STATUS, JSON.stringify(status));
}

export function isClassLocked(classId) {
  const orderStatus = getOrderStatus();
  return orderStatus[classId] && orderStatus[classId].locked;
}

export function isClassConfirmed(classId) {
  const orderStatus = getOrderStatus();
  return orderStatus[classId] && orderStatus[classId].confirmed;
}

export function confirmClassOrder(classId) {
  const orderStatus = getOrderStatus();
  orderStatus[classId] = {
    ...orderStatus[classId],
    confirmed: true,
    confirmedAt: new Date().toLocaleString('zh-CN')
  };
  saveOrderStatus(orderStatus);
}

export function lockClassOrder(classId) {
  const orderStatus = getOrderStatus();
  orderStatus[classId] = {
    ...orderStatus[classId],
    locked: true,
    lockedAt: new Date().toLocaleString('zh-CN')
  };
  saveOrderStatus(orderStatus);
}

export function getStudentsByClass(classId) {
  return getStudents().filter(s => s.classId === classId);
}

export function saveStudent(student) {
  const students = getStudents();
  const index = students.findIndex(s => s.id === student.id);
  if (index >= 0) {
    students[index] = student;
  } else {
    students.push(student);
  }
  saveStudents(students);
}

export function getSizeName(sizeId) {
  const size = SIZES.find(s => s.id === sizeId);
  return size ? size.name : sizeId;
}

export function getTypeName(typeId) {
  const type = UNIFORM_TYPES.find(t => t.id === typeId);
  return type ? type.name : typeId;
}

export function calculateAmount(types) {
  return types.reduce((sum, typeId) => {
    const type = UNIFORM_TYPES.find(t => t.id === typeId);
    return sum + (type ? type.price : 0);
  }, 0);
}

export function hasStudentSubmitted(studentId) {
  const students = getStudents();
  const student = students.find(s => s.id === studentId);
  return student && student.status === 'submitted';
}

export function canSubmitOrder(classId) {
  const students = getStudentsByClass(classId);
  const allConfirmed = students.every(s => s.status === 'submitted' && s.size && s.types.length > 0);
  return allConfirmed && !isClassLocked(classId);
}

export function getClassSummary(classId) {
  const students = getStudentsByClass(classId);
  const submitted = students.filter(s => s.status === 'submitted');
  const pending = students.filter(s => s.status === 'pending');
  return {
    total: students.length,
    submitted: submitted.length,
    pending: pending.length,
    totalAmount: submitted.reduce((sum, s) => sum + calculateAmount(s.types), 0)
  };
}

export function getProductionSummary() {
  const students = getStudents();
  const summary = {};
  
  students.filter(s => s.status === 'submitted').forEach(student => {
    const size = student.size;
    student.types.forEach(type => {
      const key = `${type}-${size}`;
      if (!summary[key]) {
        summary[key] = { type, size, count: 0 };
      }
      summary[key].count++;
    });
  });
  
  return Object.values(summary);
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ORDER_STATUS);
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  initStorage();
}

export function getClassName(classId) {
  const cls = CLASSES.find(c => c.id === classId);
  return cls ? cls.name : classId;
}
