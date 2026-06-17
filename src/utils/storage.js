import {
  CLASSES,
  SIZES,
  SEASONS,
  STATUS_MAP,
  initialStudents,
  initialOrderStatus,
  initialChangeLogs
} from '../data/mockData';

export const STORAGE_KEYS = {
  STUDENTS: 'uniform_students',
  ORDER_STATUS: 'uniform_order_status',
  CHANGE_LOGS: 'uniform_change_logs',
  INITIALIZED: 'uniform_initialized_v5'
};

export function initStorage() {
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!initialized) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
    localStorage.setItem(STORAGE_KEYS.ORDER_STATUS, JSON.stringify(initialOrderStatus));
    localStorage.setItem(STORAGE_KEYS.CHANGE_LOGS, JSON.stringify(initialChangeLogs));
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

export function getChangeLogs() {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.CHANGE_LOGS);
  return data ? JSON.parse(data) : [];
}

export function saveChangeLogs(logs) {
  localStorage.setItem(STORAGE_KEYS.CHANGE_LOGS, JSON.stringify(logs));
}

export function addChangeLog(studentId, type, season, detail, operator = '系统') {
  const logs = getChangeLogs();
  logs.unshift({
    id: `log${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    studentId,
    type,
    season,
    detail,
    operator,
    timestamp: new Date().toLocaleString('zh-CN')
  });
  saveChangeLogs(logs);
}

export function getStudentChangeLogs(studentId) {
  return getChangeLogs().filter(log => log.studentId === studentId);
}

export function getClassSeasonStatus(classId, season) {
  const orderStatus = getOrderStatus();
  return orderStatus[classId] && orderStatus[classId][season]
    ? orderStatus[classId][season]
    : { confirmed: false, locked: false, confirmedAt: null, lockedAt: null, deadline: null };
}

export function isClassSeasonLocked(classId, season) {
  return getClassSeasonStatus(classId, season).locked;
}

export function isClassSeasonConfirmed(classId, season) {
  return getClassSeasonStatus(classId, season).confirmed;
}

export function getClassDeadline(classId, season) {
  return getClassSeasonStatus(classId, season).deadline;
}

export function confirmClassSeasonOrder(classId, season, dryRun = false) {
  const duplicates = findDuplicateStudentsAcrossClasses(season);
  if (duplicates.length > 0) {
    return {
      success: false,
      message: `存在跨班级重复占位的学生（${duplicates.length}名），请先处理后再确认`,
      duplicates: duplicates.map(d => ({
        key: d.key,
        studentId: d.studentId,
        studentNo: d.studentNo,
        studentName: d.studentName,
        occurrences: d.occurrences
      }))
    };
  }

  if (dryRun) {
    return { success: true, dryRun: true };
  }

  const orderStatus = getOrderStatus();
  if (!orderStatus[classId]) orderStatus[classId] = {};
  orderStatus[classId][season] = {
    ...orderStatus[classId][season],
    confirmed: true,
    confirmedAt: new Date().toLocaleString('zh-CN')
  };
  saveOrderStatus(orderStatus);
  addChangeLog(classId, 'confirm', season, `${getClassName(classId)} ${getSeasonName(season)}订单已确认`, '家委会');
  return { success: true };
}

export function lockClassSeasonOrder(classId, season) {
  const orderStatus = getOrderStatus();
  if (!orderStatus[classId]) orderStatus[classId] = {};
  orderStatus[classId][season] = {
    ...orderStatus[classId][season],
    locked: true,
    lockedAt: new Date().toLocaleString('zh-CN')
  };
  saveOrderStatus(orderStatus);
  addChangeLog(null, 'lock', season, `${getClassName(classId)} ${getSeasonName(season)}订单已锁定`, '供应商');
}

export function getStudentsByClass(classId) {
  return getStudents().filter(s => s.classId === classId);
}

export function findStudentByNoOrName(studentNo, name) {
  const students = getStudents();
  if (studentNo) {
    const byNo = students.find(s => s.studentNo === studentNo);
    if (byNo) return byNo;
  }
  if (name) {
    return students.find(s => s.name === name);
  }
  return null;
}

export function findStudentDuplicates(studentId, season, excludeSelfClass = false) {
  const allStudents = getStudents();
  const currentStudent = allStudents.find(s => s.id === studentId);
  if (!currentStudent) return [];

  const matchKey = currentStudent.studentNo ? 'studentNo' : 'name';
  const matchValue = currentStudent[matchKey];

  return allStudents.filter(s => {
    if (s.id === studentId) return false;
    if (s[matchKey] !== matchValue) return false;
    if (excludeSelfClass && s.classId === currentStudent.classId) return false;
    const order = s.orders && s.orders[season];
    return order && order.size &&
      (order.status === 'submitted' || order.status === 'supplementary' || order.status === 'draft' || order.status === 'pending_review');
  });
}

export function findDuplicateStudentsAcrossClasses(season) {
  const allStudents = getStudents();
  const seen = {};
  const duplicates = [];

  allStudents.forEach(student => {
    const order = student.orders && student.orders[season];
    if (!order || !order.size) return;
    if (!['submitted', 'supplementary', 'draft', 'pending_review'].includes(order.status)) return;

    const key = student.studentNo || student.name;
    if (!seen[key]) {
      seen[key] = [];
    }
    seen[key].push({
      studentId: student.id,
      name: student.name,
      studentNo: student.studentNo,
      classId: student.classId,
      className: getClassName(student.classId),
      size: order.size,
      sizeName: getSizeName(order.size),
      status: order.status
    });
  });

  Object.keys(seen).forEach(key => {
    if (seen[key].length > 1) {
      const records = seen[key];
      duplicates.push({
        key,
        studentId: records[0].studentId,
        studentNo: records[0].studentNo,
        studentName: records[0].name,
        records: records,
        occurrences: records.map(r => ({
          studentId: r.studentId,
          classId: r.classId,
          className: r.className,
          size: r.size,
          sizeName: r.sizeName,
          status: r.status
        }))
      });
    }
  });

  return duplicates;
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

export function hasStudentOrderInSeason(studentId, season) {
  const student = getStudents().find(s => s.id === studentId);
  return student && student.orders && student.orders[season] && student.orders[season].size;
}

export function hasStudentSubmittedInSeason(studentId, season) {
  const student = getStudents().find(s => s.id === studentId);
  if (!student || !student.orders || !student.orders[season]) return false;
  const status = student.orders[season].status;
  return status === 'submitted' || status === 'supplementary';
}

export function hasStudentOrderPendingReview(studentId, season) {
  const student = getStudents().find(s => s.id === studentId);
  return student && student.orders && student.orders[season] && student.orders[season].status === 'pending_review';
}

export function saveStudentSeasonOrder(studentId, season, orderData, operator = '班主任') {
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.id === studentId);
  if (studentIndex < 0) return { success: false, message: '学生不存在' };

  const student = students[studentIndex];
  if (!student.orders) student.orders = {};
  const oldOrder = student.orders[season];

  const targetClassId = orderData.classId || student.classId;
  const classSeasonConfirmed = isClassSeasonConfirmed(targetClassId, season);
  const classSeasonLocked = isClassSeasonLocked(targetClassId, season);

  const isConflict = oldOrder && oldOrder.size && oldOrder.size !== orderData.size
    && (oldOrder.status === 'submitted' || oldOrder.status === 'draft' || oldOrder.status === 'pending_review');

  const isClassChanged = orderData.classId && orderData.classId !== student.classId;

  if (classSeasonLocked && !orderData.isSupplementary) {
    if (oldOrder && (oldOrder.status === 'submitted' || oldOrder.status === 'supplementary')) {
      return { success: false, message: '该季节订单已锁定，已提交的尺码不可修改，仅可通过新增补单处理' };
    }
  }

  if (classSeasonConfirmed && oldOrder && (oldOrder.status === 'submitted') && !orderData.isSupplementary) {
    return { success: false, message: '该季节订单已由家委会确认，如需修改请联系家委会取消确认，或走补录流程' };
  }

  if (isConflict && !orderData.isSupplementary) {
    student.orders[season] = {
      ...oldOrder,
      status: 'pending_review',
      pendingSize: orderData.size,
      pendingFromClass: isClassChanged ? student.classId : null,
      pendingToClass: isClassChanged ? orderData.classId : null,
      updatedAt: new Date().toLocaleString('zh-CN')
    };
    saveStudents(students);
    const conflictDetail = isClassChanged
      ? `班级变更+尺码冲突：从${getClassName(student.classId)}转入${getClassName(orderData.classId)}，原尺码${getSizeName(oldOrder.size)}，新申请${getSizeName(orderData.size)}，旧记录已转为待复核`
      : `尺码冲突：原尺码${getSizeName(oldOrder.size)}，新提交${getSizeName(orderData.size)}，旧记录已转为待复核，不可直接覆盖`;
    addChangeLog(
      studentId,
      isClassChanged ? 'class_change_conflict' : 'conflict',
      season,
      conflictDetail,
      operator
    );
    return {
      success: true,
      pendingReview: true,
      conflict: true,
      message: '存在已有记录，系统不直接覆盖，已将旧记录转为待复核，请等待家委会处理'
    };
  }

  if (isClassChanged && !isConflict && oldOrder
    && (oldOrder.status === 'submitted' || oldOrder.status === 'draft' || oldOrder.status === 'pending_review')) {
    oldOrder.status = 'pending_review';
    oldOrder.fromClass = student.classId;
    oldOrder.pendingToClass = orderData.classId;
    oldOrder.updatedAt = new Date().toLocaleString('zh-CN');
    addChangeLog(
      studentId,
      'class_change',
      season,
      `学生从${getClassName(student.classId)}申请转入${getClassName(orderData.classId)}，原班级记录已转为待复核，避免重复占位`,
      operator
    );
  }

  if (!orderData.isSupplementary) {
    const duplicates = findStudentDuplicates(studentId, season, true);
    if (duplicates.length > 0 && !isClassChanged) {
      const dupInfo = duplicates.map(d => `${getClassName(d.classId)}(${d.studentNo || d.name})`).join('、');
      return {
        success: false,
        duplicateDetected: true,
        duplicates,
        message: `检测到该学生在其他班级已有同季节订购记录：${dupInfo}。请通过班级变更流程处理，避免一个人重复占两次名额`
      };
    }
  }

  const isSupplementary = orderData.isSupplementary || (classSeasonLocked && !oldOrder);

  const newOrder = {
    size: orderData.size,
    status: orderData.status || (isSupplementary ? 'supplementary' : 'draft'),
    submittedAt: orderData.status === 'submitted' ? new Date().toLocaleString('zh-CN') : null,
    isSupplementary: isSupplementary,
    batchId: isSupplementary ? `supp-${classSeasonLocked ? 'postlock' : 'prelock'}-${Date.now()}` : `normal-${targetClassId}-${season}`,
    updatedAt: new Date().toLocaleString('zh-CN')
  };

  if (isClassChanged) {
    student.classId = orderData.classId;
  }

  student.orders[season] = newOrder;

  students[studentIndex] = student;
  saveStudents(students);

  const actionLabel = isSupplementary
    ? (orderData.status === 'submitted' ? '补录提交' : '补录入稿')
    : (orderData.status === 'submitted' ? '正式提交' : '保存试穿稿');

  addChangeLog(
    studentId,
    isSupplementary ? 'supplementary' : (orderData.status === 'submitted' ? 'submit' : 'draft'),
    season,
    `${actionLabel}${getSeasonName(season)}尺码 ${getSizeName(orderData.size)}${isSupplementary ? '（补录批次）' : ''}`,
    operator
  );

  return {
    success: true,
    supplementary: isSupplementary,
    message: `${actionLabel}成功`
  };
}

export function submitStudentSeasonOrder(studentId, season, operator = '班主任') {
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.id === studentId);
  if (studentIndex < 0) return { success: false, message: '学生不存在' };

  const student = students[studentIndex];
  if (!student.orders || !student.orders[season] || !student.orders[season].size) {
    return { success: false, message: '请先选择尺码' };
  }

  const order = student.orders[season];
  if (order.status === 'submitted' || order.status === 'supplementary') {
    return { success: false, message: '该季节订单已提交' };
  }

  if (order.status === 'pending_review') {
    return { success: false, message: '该记录处于待复核状态，请家委会处理后再提交' };
  }

  if (isClassSeasonLocked(student.classId, season)) {
    return { success: false, message: '该季节订单已锁定，无法提交' };
  }

  order.status = isClassSeasonConfirmed(student.classId, season) ? 'supplementary' : 'submitted';
  order.submittedAt = new Date().toLocaleString('zh-CN');
  order.updatedAt = new Date().toLocaleString('zh-CN');

  if (order.status === 'supplementary' && !order.batchId) {
    order.batchId = `supp-postconfirm-${Date.now()}`;
  }

  students[studentIndex] = student;
  saveStudents(students);

  addChangeLog(
    studentId,
    order.isSupplementary ? 'supplementary_submit' : 'submit',
    season,
    `确认提交${getSeasonName(season)}尺码 ${getSizeName(order.size)}${order.isSupplementary ? '（补录）' : ''}`,
    operator
  );

  return { success: true, message: '提交成功' };
}

export function resolvePendingReview(studentId, season, accept, operator = '家委会') {
  const students = getStudents();
  const studentIndex = students.findIndex(s => s.id === studentId);
  if (studentIndex < 0) return { success: false, message: '学生不存在' };

  const student = students[studentIndex];
  if (!student.orders || !student.orders[season] || student.orders[season].status !== 'pending_review') {
    return { success: false, message: '没有待复核记录' };
  }

  const order = student.orders[season];
  if (accept) {
    const newSize = order.pendingSize || order.size;
    order.oldSize = order.size;
    order.size = newSize;

    if (order.pendingToClass) {
      student.classId = order.pendingToClass;
      addChangeLog(
        studentId,
        'class_change_accept',
        season,
        `复核通过：班级变更至${getClassName(order.pendingToClass)}，尺码由${getSizeName(order.oldSize)}更新为${getSizeName(newSize)}`,
        operator
      );
    } else {
      addChangeLog(
        studentId,
        'review_accept',
        season,
        `复核通过：尺码由${getSizeName(order.oldSize)}更新为${getSizeName(newSize)}`,
        operator
      );
    }

    order.status = 'submitted';
    order.submittedAt = order.submittedAt || new Date().toLocaleString('zh-CN');
    order.pendingSize = null;
    order.pendingFromClass = null;
    order.pendingToClass = null;
    order.fromClass = null;
  } else {
    const rejectedSize = order.pendingSize || order.size;
    if (order.fromClass) {
      addChangeLog(
        studentId,
        'class_change_reject',
        season,
        `复核驳回：保留原班级${getClassName(order.fromClass)}、原尺码${getSizeName(order.size)}，驳回转入${order.pendingToClass ? getClassName(order.pendingToClass) : ''}申请`,
        operator
      );
    } else {
      addChangeLog(
        studentId,
        'review_reject',
        season,
        `复核驳回：保留原尺码${getSizeName(order.size)}，新申请尺码${getSizeName(rejectedSize)}无效`,
        operator
      );
    }
    order.status = 'submitted';
    order.pendingSize = null;
    order.pendingFromClass = null;
    order.pendingToClass = null;
  }

  order.updatedAt = new Date().toLocaleString('zh-CN');
  students[studentIndex] = student;
  saveStudents(students);
  return { success: true, message: accept ? '复核通过，已更新' : '复核驳回，保留原记录' };
}

export function getClassSeasonSummary(classId, season) {
  const students = getStudentsByClass(classId);
  let submitted = 0;
  let draft = 0;
  let pendingReview = 0;
  let supplementary = 0;
  let pending = 0;
  let totalAmount = 0;
  let submittedAmount = 0;

  students.forEach(student => {
    const order = student.orders && student.orders[season];
    if (!order || !order.size) {
      pending++;
    } else {
      switch (order.status) {
        case 'submitted':
          submitted++;
          submittedAmount += getSeasonPrice(season);
          totalAmount += getSeasonPrice(season);
          break;
        case 'supplementary':
          supplementary++;
          submitted++;
          submittedAmount += getSeasonPrice(season);
          totalAmount += getSeasonPrice(season);
          break;
        case 'draft':
          draft++;
          totalAmount += getSeasonPrice(season);
          break;
        case 'pending_review':
          pendingReview++;
          totalAmount += getSeasonPrice(season);
          break;
        default:
          pending++;
      }
    }
  });

  return {
    total: students.length,
    submitted,
    draft,
    pendingReview,
    supplementary,
    pending,
    totalAmount,
    submittedAmount
  };
}

export function canSubmitSeasonOrder(classId, season) {
  const summary = getClassSeasonSummary(classId, season);
  const locked = isClassSeasonLocked(classId, season);
  const duplicates = findDuplicateStudentsAcrossClasses(season);
  return !locked
    && summary.pending === 0
    && summary.draft === 0
    && summary.pendingReview === 0
    && duplicates.length === 0;
}

export function getDuplicateInfoForSeason(season) {
  return findDuplicateStudentsAcrossClasses(season);
}

export function getSizeName(sizeId) {
  const size = SIZES.find(s => s.id === sizeId);
  return size ? size.name : (sizeId || '未选择');
}

export function getSeasonName(seasonId) {
  const season = SEASONS.find(s => s.id === seasonId);
  return season ? season.name : (seasonId || '');
}

export function getSeasonPrice(seasonId) {
  const season = SEASONS.find(s => s.id === seasonId);
  return season ? season.price : 0;
}

export function getStatusLabel(status) {
  return STATUS_MAP[status] ? STATUS_MAP[status].label : status;
}

export function getStatusColor(status) {
  return STATUS_MAP[status] ? STATUS_MAP[status].color : 'default';
}

export function getClassName(classId) {
  const cls = CLASSES.find(c => c.id === classId);
  return cls ? cls.name : classId;
}

export function getProductionSummaryByStatus() {
  const students = getStudents();
  const result = {
    confirmed: [],
    pending_lock: [],
    supplementary: []
  };

  SEASONS.forEach(season => {
    CLASSES.forEach(cls => {
      const seasonStatus = getClassSeasonStatus(cls.id, season.id);
      const classStudents = getStudentsByClass(cls.id);

      classStudents.forEach(student => {
        const order = student.orders && student.orders[season.id];
        if (!order || !order.size) return;

        const item = {
          studentId: student.id,
          studentName: student.name,
          studentNo: student.studentNo,
          classId: cls.id,
          className: cls.name,
          season: season.id,
          seasonName: season.name,
          seasonIcon: season.icon,
          size: order.size,
          sizeName: getSizeName(order.size),
          isSupplementary: !!order.isSupplementary,
          status: order.status,
          batchId: order.batchId || `normal-${cls.id}-${season.id}`,
          price: season.price,
          submittedAt: order.submittedAt || order.updatedAt
        };

        if (order.status === 'supplementary') {
          result.supplementary.push(item);
        } else if (order.status === 'submitted' && seasonStatus.locked) {
          result.confirmed.push(item);
        } else if (order.status === 'submitted' && seasonStatus.confirmed && !seasonStatus.locked) {
          result.pending_lock.push(item);
        }
      });
    });
  });

  return result;
}

export function getSeasonClassBatches() {
  const batches = [];
  SEASONS.forEach(season => {
    CLASSES.forEach(cls => {
      const status = getClassSeasonStatus(cls.id, season.id);
      const summary = getClassSeasonSummary(cls.id, season.id);

      let normalBatchStatus = 'pending';
      if (status.locked) normalBatchStatus = 'confirmed';
      else if (status.confirmed) normalBatchStatus = 'pending_lock';

      const normalSubmitted = summary.submitted - summary.supplementary;
      if (normalSubmitted > 0 || !status.locked) {
        batches.push({
          id: `normal-${cls.id}-${season.id}`,
          batchType: 'normal',
          classId: cls.id,
          className: cls.name,
          season: season.id,
          seasonName: season.name,
          seasonIcon: season.icon,
          status: normalBatchStatus,
          confirmed: status.confirmed,
          locked: status.locked,
          confirmedAt: status.confirmedAt,
          lockedAt: status.lockedAt,
          deadline: status.deadline,
          total: summary.total,
          submitted: normalSubmitted,
          supplementary: 0,
          pendingReview: summary.pendingReview,
          pending: summary.pending,
          totalAmount: normalSubmitted * getSeasonPrice(season.id)
        });
      }

      if (summary.supplementary > 0) {
        batches.push({
          id: `supp-${cls.id}-${season.id}`,
          batchType: 'supplementary',
          classId: cls.id,
          className: cls.name,
          season: season.id,
          seasonName: season.name,
          seasonIcon: season.icon,
          status: status.locked ? 'confirmed' : (status.confirmed ? 'pending_lock' : 'pending'),
          confirmed: status.confirmed,
          locked: status.locked,
          confirmedAt: status.confirmedAt,
          lockedAt: status.lockedAt,
          deadline: status.deadline,
          total: summary.supplementary,
          submitted: summary.supplementary,
          supplementary: summary.supplementary,
          pendingReview: 0,
          pending: 0,
          totalAmount: summary.supplementary * getSeasonPrice(season.id)
        });
      }
    });
  });
  return batches;
}

export function getSizeSummaryBySeasonAndStatus(season, statusList) {
  const students = getStudents();
  const sizeCount = {};

  students.forEach(student => {
    const order = student.orders && student.orders[season];
    if (order && order.size && statusList.includes(order.status)) {
      sizeCount[order.size] = (sizeCount[order.size] || 0) + 1;
    }
  });

  return SIZES.map(size => ({
    id: size.id,
    name: size.name,
    height: size.height,
    count: sizeCount[size.id] || 0
  }));
}

export function getStudentFullHistory(studentId) {
  const student = getStudents().find(s => s.id === studentId);
  if (!student) return null;

  const seasonSummaries = SEASONS.map(season => {
    const order = student.orders && student.orders[season.id];
    return {
      seasonId: season.id,
      seasonName: season.name,
      seasonIcon: season.icon,
      deadline: getClassDeadline(student.classId, season.id),
      classSeasonStatus: getClassSeasonStatus(student.classId, season.id),
      order: order || null
    };
  });

  const changeLogs = getStudentChangeLogs(studentId);

  const allDuplicates = [];
  SEASONS.forEach(season => {
    const dups = findStudentDuplicates(studentId, season.id, true);
    if (dups.length > 0) {
      allDuplicates.push({
        seasonId: season.id,
        seasonName: season.name,
        duplicates: dups
      });
    }
  });

  return {
    student,
    seasonSummaries,
    changeLogs,
    duplicates: allDuplicates
  };
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ORDER_STATUS);
  localStorage.removeItem(STORAGE_KEYS.CHANGE_LOGS);
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  initStorage();
}
