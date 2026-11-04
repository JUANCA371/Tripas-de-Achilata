const attendanceOptions = [
  { value: "pending", label: "Sin registrar" },
  { value: "present", label: "Presente" },
  { value: "late", label: "Tarde" },
  { value: "absent", label: "Ausente" }
];
const attendanceStatus = document.querySelector("#attendance-status");
const authStatus = document.querySelector("#auth-status");
const classPicker = document.querySelector("#class-picker");
const studentList = document.querySelector("#student-list");
const todayDate = document.querySelector("#today-date");
let supabaseClient = null;
let activeSession = null;
let activeClassId = "";
let students = [];
let attendanceByStudent = {};
let pendingImportRows = [];
let attendanceIsDirty = false;
let attendanceChannel = null;
let authRevision = 0;
let classRevision = 0;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showToday() {
  todayDate.textContent = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());
}

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle("is-error", isError);
}

function setAttendanceStatus(message, isError = false) {
  attendanceStatus.textContent = message;
  attendanceStatus.classList.toggle("is-error", isError);
}

function showLogin(message = "") {
  authRevision += 1;
  classRevision += 1;
  if (attendanceChannel && supabaseClient) {
    const channel = attendanceChannel;
    attendanceChannel = null;
    supabaseClient.removeChannel(channel).catch((error) => {
      console.error("No se pudo cerrar el canal de asistencia.", error);
    });
  }
  activeSession = null;
  activeClassId = "";
  students = [];
  attendanceByStudent = {};
  attendanceIsDirty = false;
  document.querySelector("#auth-panel").hidden = false;
  document.querySelector("#dashboard-content").hidden = true;
  document.querySelector("#main-nav").hidden = true;
  document.querySelector("#profile-display").hidden = true;
  document.querySelector("#notification-button").hidden = true;
  document.querySelector("#profile-name").textContent = "";
  studentList.replaceChildren();
  classPicker.replaceChildren(new Option("Sin cursos", ""));
  classPicker.disabled = true;
  document.querySelector("#save-attendance").disabled = true;
  document.querySelector("#roster-empty").hidden = false;
  updateAttendanceSummary();
  setAuthStatus(message || "Ingresá con la cuenta docente autorizada.", Boolean(message));
}

function showDashboard(user) {
  document.querySelector("#auth-panel").hidden = true;
  document.querySelector("#dashboard-content").hidden = false;
  document.querySelector("#main-nav").hidden = false;
  document.querySelector("#profile-display").hidden = false;
  document.querySelector("#notification-button").hidden = false;
  document.querySelector("#profile-name").textContent = user.email || "Docente";
}

function showDatabaseError(error, context) {
  console.error(context, error);
  setAttendanceStatus("No se pudieron cargar los datos. Revisá la conexión e intentá de nuevo.", true);
}

function updateAttendanceSummary() {
  const counts = { present: 0, late: 0, absent: 0 };
  Object.values(attendanceByStudent).forEach((status) => {
    if (Object.hasOwn(counts, status)) counts[status] += 1;
  });
  document.querySelector("#present-count").textContent = counts.present;
  document.querySelector("#late-count").textContent = counts.late;
  document.querySelector("#absent-count").textContent = counts.absent;
}

function renderStudents() {
  const fragment = document.createDocumentFragment();
  students.forEach((student) => {
    const item = document.createElement("li");
    item.className = "student-row";

    const info = document.createElement("span");
    info.className = "student-info";
    const avatar = document.createElement("span");
    avatar.className = "student-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = `${student.first_name[0] || ""}${student.last_name[0] || ""}`;
    const name = document.createElement("span");
    name.className = "student-name";
    name.textContent = `${student.first_name} ${student.last_name}`;
    info.append(avatar, name);

    const select = document.createElement("select");
    select.className = "attendance-select";
    select.dataset.studentId = student.id;
    select.setAttribute("aria-label", `Asistencia de ${student.first_name} ${student.last_name}`);
    attendanceOptions.forEach((option) => {
      select.add(new Option(option.label, option.value));
    });
    select.value = attendanceByStudent[student.id] || "pending";
    select.dataset.status = select.value;
    select.addEventListener("change", () => {
      attendanceByStudent[student.id] = select.value;
      select.dataset.status = select.value;
      attendanceIsDirty = true;
      updateAttendanceSummary();
      setAttendanceStatus("Hay cambios sin guardar.");
    });

    item.append(info, select);
    fragment.append(item);
  });
  studentList.replaceChildren(fragment);
  document.querySelector("#roster-empty").hidden = students.length > 0;
  document.querySelector("#save-attendance").disabled = students.length === 0;
  document.querySelector("#roster-count").textContent = `${students.length} ${students.length === 1 ? "estudiante" : "estudiantes"}`;
  updateAttendanceSummary();
}

async function loadAttendance() {
  if (!activeClassId || students.length === 0) {
    attendanceByStudent = {};
    attendanceIsDirty = false;
    renderStudents();
    setAttendanceStatus("");
    return;
  }

  const selectedClassId = activeClassId;
  const selectedStudents = students;
  const studentIds = selectedStudents.map((student) => student.id);
  const { data, error } = await supabaseClient
    .from("attendance")
    .select("student_id,status")
    .eq("attendance_date", localDateKey())
    .in("student_id", studentIds);

  if (error) {
    showDatabaseError(error, "No se pudo cargar la asistencia.");
    return;
  }
  if (selectedClassId !== activeClassId) return;

  attendanceByStudent = Object.fromEntries(data.map((record) => [record.student_id, record.status]));
  attendanceIsDirty = false;
  renderStudents();
  setAttendanceStatus("Asistencia sincronizada para hoy.");
}

async function loadSelectedClass() {
  const revision = ++classRevision;
  activeClassId = classPicker.value;
  attendanceByStudent = {};
  attendanceIsDirty = false;
  studentList.replaceChildren();
  document.querySelector("#save-attendance").disabled = true;
  document.querySelector("#class-title").textContent = classPicker.selectedOptions[0]?.textContent || "Seleccioná un curso";
  document.querySelector("#roster-empty").hidden = false;
  document.querySelector("#roster-empty").textContent = activeClassId
    ? "Cargando estudiantes…"
    : "Elegí un curso o importá una planilla para cargar el padrón.";
  updateAttendanceSummary();
  setAttendanceStatus("");

  if (attendanceChannel) {
    await supabaseClient.removeChannel(attendanceChannel);
    attendanceChannel = null;
  }
  if (!activeClassId) return;

  const { data, error } = await supabaseClient
    .from("students")
    .select("id,first_name,last_name")
    .eq("class_id", activeClassId)
    .order("last_name")
    .order("first_name");

  if (error) {
    if (revision !== classRevision) return;
    showDatabaseError(error, "No se pudo cargar el padrón.");
    document.querySelector("#roster-empty").textContent = "No se pudo cargar el padrón. Revisá la conexión.";
    return;
  }

  if (revision !== classRevision) return;
  students = data;
  await loadAttendance();
  subscribeToAttendance();
}

function subscribeToAttendance() {
  if (!activeClassId || students.length === 0) return;
  attendanceChannel = supabaseClient
    .channel(`attendance-${activeClassId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, (payload) => {
      const changed = payload.new?.student_id || payload.old?.student_id;
      if (!students.some((student) => student.id === changed)) return;
      if (payload.new?.attendance_date && payload.new.attendance_date !== localDateKey()) return;
      if (attendanceIsDirty) {
        setAttendanceStatus("Hay cambios de otro dispositivo. Guardá o revisá tus cambios antes de recargar.");
        return;
      }
      loadAttendance().catch((error) => showDatabaseError(error, "Falló la sincronización de asistencia."));
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setAttendanceStatus("No se pudo conectar la sincronización en tiempo real. Podés guardar igualmente.", true);
      }
    });
}

async function loadClasses(selectClassId = "") {
  const revision = authRevision;
  const { data, error } = await supabaseClient
    .from("classes")
    .select("id,name")
    .order("name");

  if (error) {
    if (revision !== authRevision) return;
    showDatabaseError(error, "No se pudieron cargar los cursos.");
    return;
  }
  if (revision !== authRevision || !activeSession) return;

  const previousClass = selectClassId || classPicker.value;
  classPicker.replaceChildren(new Option(data.length ? "Elegí un curso" : "Sin cursos", ""));
  data.forEach((classItem) => classPicker.add(new Option(classItem.name, classItem.id)));
  classPicker.disabled = data.length === 0;
  document.querySelector("#class-total").textContent = `${data.length} ${data.length === 1 ? "curso" : "cursos"}`;

  if (data.length) {
    const selected = data.find((classItem) => classItem.id === previousClass) || data[0];
    classPicker.value = selected.id;
    await loadSelectedClass();
  } else {
    activeClassId = "";
    students = [];
    renderStudents();
    setAttendanceStatus("Importá una planilla para crear el primer curso.");
  }
}

async function saveAttendance() {
  if (!activeClassId || students.length === 0) return;
  const records = students.map((student) => ({
    student_id: student.id,
    attendance_date: localDateKey(),
    status: attendanceByStudent[student.id] || "pending",
    updated_at: new Date().toISOString()
  }));
  const button = document.querySelector("#save-attendance");
  button.disabled = true;
  setAttendanceStatus("Guardando asistencia…");

  const { error } = await supabaseClient
    .from("attendance")
    .upsert(records, { onConflict: "student_id,attendance_date" });

  button.disabled = false;
  if (error) {
    showDatabaseError(error, "No se pudo guardar la asistencia.");
    return;
  }
  if (!activeSession) return;

  attendanceIsDirty = false;
  setAttendanceStatus("Asistencia guardada y sincronizada.");
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function readRosterFile(file) {
  if (!file) return;
  const status = document.querySelector("#import-status");
  const confirmButton = document.querySelector("#confirm-import");
  pendingImportRows = [];
  confirmButton.hidden = true;
  status.classList.remove("is-error");

  if (file.size > 5_000_000) {
    status.textContent = "El archivo supera el límite de 5 MB.";
    status.classList.add("is-error");
    return;
  }

  try {
    if (!window.XLSX) throw new Error("No se pudo cargar el lector de Excel. Revisá tu conexión e intentá de nuevo.");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("El archivo no contiene una hoja para importar.");

    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false });
    if (rows.length === 0 || rows.length > 500) {
      throw new Error("La planilla debe contener entre 1 y 500 filas de estudiantes.");
    }

    const headers = Object.keys(rows[0]);
    const columns = {
      first_name: headers.find((header) => ["nombre", "nombres"].includes(normalizeHeader(header))),
      last_name: headers.find((header) => ["apellido", "apellidos"].includes(normalizeHeader(header))),
      class_name: headers.find((header) => ["curso", "clase"].includes(normalizeHeader(header)))
    };
    if (Object.values(columns).some((column) => !column)) {
      throw new Error("Faltan columnas. Usá la plantilla con Nombre, Apellido y Curso.");
    }

    const seen = new Set();
    pendingImportRows = rows.map((row, index) => {
      const student = {
        first_name: String(row[columns.first_name] || "").trim(),
        last_name: String(row[columns.last_name] || "").trim(),
        class_name: String(row[columns.class_name] || "").trim()
      };
      if (!student.first_name || !student.last_name || !student.class_name) {
        throw new Error(`Completá nombre, apellido y curso en la fila ${index + 2}.`);
      }
      if (student.first_name.length > 120 || student.last_name.length > 120 || student.class_name.length > 120) {
        throw new Error(`Hay un valor que supera 120 caracteres en la fila ${index + 2}.`);
      }
      const duplicateKey = [student.class_name, student.first_name, student.last_name]
        .map((value) => value.toLocaleLowerCase("es-AR"))
        .join("|");
      if (seen.has(duplicateKey)) throw new Error(`La fila ${index + 2} repite un estudiante del mismo curso.`);
      seen.add(duplicateKey);
      return student;
    });

    const courses = new Set(pendingImportRows.map((row) => row.class_name));
    const studentLabel = pendingImportRows.length === 1 ? "estudiante" : "estudiantes";
    const courseLabel = courses.size === 1 ? "curso" : "cursos";
    status.textContent = `Vista previa: ${pendingImportRows.length} ${studentLabel} en ${courses.size} ${courseLabel}. El archivo no se almacenará.`;
    confirmButton.hidden = false;
  } catch (error) {
    pendingImportRows = [];
    status.textContent = error.message || "No se pudo leer la planilla.";
    status.classList.add("is-error");
  }
}

async function importRoster() {
  if (!activeSession || pendingImportRows.length === 0) return;
  const status = document.querySelector("#import-status");
  const confirmButton = document.querySelector("#confirm-import");
  confirmButton.disabled = true;
  status.classList.remove("is-error");
  status.textContent = "Importando estudiantes…";

  const { data, error } = await supabaseClient.rpc("import_roster", { roster: pendingImportRows });
  if (error) {
    console.error("No se pudo importar el padrón.", error);
    status.textContent = "No se pudo importar la planilla. Revisá el esquema de Supabase e intentá de nuevo.";
    status.classList.add("is-error");
    confirmButton.disabled = false;
    return;
  }
  if (!activeSession) return;
  if (!data || !Number.isInteger(data.student_count) || !Number.isInteger(data.course_count)) {
    console.error("La importación devolvió un resultado inesperado.", data);
    status.textContent = "La respuesta de importación fue inesperada. Recargá la página y revisá el padrón.";
    status.classList.add("is-error");
    confirmButton.disabled = false;
    return;
  }

  const courseNames = [...new Set(pendingImportRows.map((row) => row.class_name))];
  const { data: classRows, error: classError } = await supabaseClient
    .from("classes")
    .select("id,name")
    .in("name", courseNames);
  if (classError) {
    console.error("No se pudo actualizar la lista de cursos después de importar.", classError);
    status.textContent = "El padrón se importó, pero no se pudo actualizar la vista. Recargá la página.";
    status.classList.add("is-error");
    confirmButton.disabled = false;
    return;
  }

  const firstCourseId = classRows.find((classItem) => classItem.name === pendingImportRows[0].class_name)?.id;
  if (!firstCourseId) {
    status.textContent = "El padrón se importó, pero no se pudo abrir el curso. Recargá la página.";
    status.classList.add("is-error");
    confirmButton.disabled = false;
    return;
  }
  pendingImportRows = [];
  document.querySelector("#roster-file").value = "";
  confirmButton.hidden = true;
  confirmButton.disabled = false;
  await loadClasses(firstCourseId);
  const studentLabel = data.student_count === 1 ? "estudiante nuevo" : "estudiantes nuevos";
  const courseLabel = data.course_count === 1 ? "curso" : "cursos";
  status.textContent = `Planilla importada: ${data.student_count} ${studentLabel} en ${data.course_count} ${courseLabel}. El archivo no se almacenó.`;
}

async function authorizeSession(session) {
  const revision = ++authRevision;
  if (!session) {
    showLogin();
    return;
  }

  setAuthStatus("Verificando permisos docentes…");
  const { data, error } = await supabaseClient
    .from("allowed_teachers")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (revision !== authRevision) return;
  if (error) {
    console.error("No se pudieron verificar los permisos docentes.", error);
    showLogin("No se pudo verificar el acceso. Comprobá la configuración de seguridad.");
    return;
  }
  if (!data) {
    await supabaseClient.auth.signOut();
    window.setTimeout(() => showLogin("Esta cuenta todavía no tiene acceso docente autorizado."), 0);
    return;
  }

  activeSession = session;
  showDashboard(session.user);
  await loadClasses();
}

function initializeTasks() {
  const taskInputs = [...document.querySelectorAll("[data-task]")];
  const taskStatus = document.querySelector("#task-status");
  try {
    const savedTasks = JSON.parse(localStorage.getItem("mi-aula-tasks") || "{}");
    taskInputs.forEach((input) => {
      input.checked = savedTasks[input.dataset.task] === true;
    });
  } catch (error) {
    console.warn("No se pudieron recuperar las tareas guardadas.", error);
    taskStatus.textContent = "No se pudieron recuperar las tareas guardadas.";
  }

  taskInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const currentTasks = Object.fromEntries(taskInputs.map((task) => [task.dataset.task, task.checked]));
      try {
        localStorage.setItem("mi-aula-tasks", JSON.stringify(currentTasks));
        taskStatus.textContent = input.checked ? "Tarea marcada como completada." : "Tarea pendiente nuevamente.";
      } catch (error) {
        console.error("No se pudo guardar el estado de la tarea.", error);
        taskStatus.textContent = "No se pudo guardar el cambio. Revisá la configuración del navegador.";
      }
    });
  });
}

function initializeNotices() {
  const dismissButton = document.querySelector("#dismiss-notices");
  const noticeList = document.querySelector("#notice-list");
  const noticeStatus = document.querySelector("#notice-status");
  const noticeCount = document.querySelector(".notice-count");
  const navCount = document.querySelector(".nav-count");
  const notificationDot = document.querySelector(".notification-dot");

  dismissButton.addEventListener("click", () => {
    noticeList.replaceChildren();
    noticeCount.textContent = "0";
    navCount.textContent = "0";
    navCount.setAttribute("aria-label", "0 avisos");
    notificationDot.hidden = true;
    dismissButton.disabled = true;
    noticeStatus.textContent = "Todos los avisos se marcaron como leídos.";
  });

  document.querySelector("[data-notifications-link]").addEventListener("click", () => {
    document.querySelector("#avisos").scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector("#notices-title").setAttribute("tabindex", "-1");
    document.querySelector("#notices-title").focus({ preventScroll: true });
  });
}

document.querySelector("#main-nav").addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  document.querySelectorAll("#main-nav a").forEach((item) => item.removeAttribute("aria-current"));
  link.setAttribute("aria-current", "page");
});
document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;
  const form = event.currentTarget;
  const button = document.querySelector("#login-submit");
  button.disabled = true;
  setAuthStatus("Iniciando sesión…");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: form.elements.email.value.trim(),
    password: form.elements.password.value
  });
  button.disabled = false;
  if (error) {
    console.error("No se pudo iniciar sesión.", error);
    setAuthStatus("No se pudo iniciar sesión. Revisá el correo y la contraseña.", true);
  }
});
document.querySelector("#sign-out").addEventListener("click", async () => {
  if (attendanceChannel) await supabaseClient.removeChannel(attendanceChannel);
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("No se pudo cerrar la sesión.", error);
    setAuthStatus("No se pudo cerrar la sesión. Intentá nuevamente.", true);
  }
});
document.querySelector("#class-picker").addEventListener("change", loadSelectedClass);
document.querySelector("#save-attendance").addEventListener("click", saveAttendance);
document.querySelector("#roster-file").addEventListener("change", (event) => {
  readRosterFile(event.currentTarget.files[0]);
});
document.querySelector("#confirm-import").addEventListener("click", importRoster);

showToday();
initializeTasks();
initializeNotices();

const configuration = window.AULA_CONFIG;
if (!configuration?.supabaseUrl || !configuration?.supabaseAnonKey || !window.supabase?.createClient) {
  showLogin(configuration?.configurationError || "El acceso seguro todavía no está configurado. Revisá la guía de instalación de Mi Aula.");
  document.querySelector("#login-submit").disabled = true;
} else {
  supabaseClient = window.supabase.createClient(configuration.supabaseUrl, configuration.supabaseAnonKey);
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("No se pudo recuperar la sesión docente.", error);
      showLogin("No se pudo recuperar la sesión. Iniciá sesión nuevamente.");
      return;
    }
    authorizeSession(data.session);
  });
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      window.setTimeout(() => authorizeSession(session), 0);
    }
  });
}
