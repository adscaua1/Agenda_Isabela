import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const senhaCorreta = "1234";

const horariosFixos = [
    "08:00", "09:00", "10:00",
    "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00",
    "17:00", "18:00"
];

let agendamentos = [];
let selecionado = null;
let horaSelecionada = null;

// LOGIN
document.getElementById("entrar").onclick = () => {
    if (document.getElementById("senha").value === senhaCorreta) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("painel").style.display = "block";
        escutarTempoReal();
    }
};

// DATA
const hoje = new Date().toISOString().split("T")[0];
document.getElementById("data").value = hoje;

// 🔥 TEMPO REAL
function escutarTempoReal() {
    const data = document.getElementById("data").value;

    const q = query(collection(db, "agendamentos"), where("data", "==", data));

    onSnapshot(q, (snap) => {
        agendamentos = [];
        snap.forEach(d => agendamentos.push({ id: d.id, ...d.data() }));
        renderizar();
    });
}

// RENDER
function renderizar() {
    const agenda = document.getElementById("agenda");
    agenda.innerHTML = "";

    horariosFixos.forEach(hora => {

        const item = agendamentos.find(a => a.hora === hora);

        const div = document.createElement("div");
        div.classList.add("slot");

        if (item) {
            if (item.bloqueado) {
                div.classList.add("bloqueado");
                div.innerHTML = `${hora} 🔒`;
            } else {
                div.classList.add("ocupado");
                div.innerHTML = `${hora}<br>${item.nome}`;
            }
        } else {
            div.classList.add("livre");
            div.innerHTML = hora;
        }

        div.onclick = () => abrirModal(hora, item);

        agenda.appendChild(div);
    });
}

// MODAL
function abrirModal(hora, item) {
    selecionado = item;
    horaSelecionada = hora;

    document.getElementById("modal").style.display = "flex";

    document.getElementById("modalHora").textContent = hora;

    if (item) {
        document.getElementById("modalInfo").textContent =
            item.bloqueado ? "Horário bloqueado" : `${item.nome} - ${item.servico}`;
    } else {
        document.getElementById("modalInfo").textContent = "Horário livre";
    }

    const btnBloquear = document.getElementById("btnBloquear");
    btnBloquear.textContent =
        item && item.bloqueado ? "🔓 Desbloquear" : "🔒 Bloquear";
}

// FECHAR
function fecharModal() {
    document.getElementById("modal").style.display = "none";
}
window.fecharModal = fecharModal;

// WHATS
document.getElementById("btnWhats").onclick = async () => {
    if (!selecionado || !selecionado.telefone) return;

    const tel = selecionado.telefone.replace(/\D/g, "");

    const msg = encodeURIComponent(
        `Olá ${selecionado.nome}!

Seu horário foi confirmado 💈
${selecionado.hora}`
    );

    const isMobile = /Android|iPhone/i.test(navigator.userAgent);

    const link = isMobile
        ? `whatsapp://send?phone=55${tel}&text=${msg}`
        : `https://wa.me/55${tel}?text=${msg}`;

    window.location.href = link;

    await updateDoc(doc(db, "agendamentos", selecionado.id), {
        status: "confirmado"
    });

    fecharModal();
};

// CANCELAR
document.getElementById("btnCancelar").onclick = async () => {
    if (!selecionado) return;

    await deleteDoc(doc(db, "agendamentos", selecionado.id));
    fecharModal();
};

// BLOQUEAR / DESBLOQUEAR
document.getElementById("btnBloquear").onclick = async () => {
    const data = document.getElementById("data").value;

    if (selecionado && selecionado.bloqueado) {
        await deleteDoc(doc(db, "agendamentos", selecionado.id));
    } else {
        await addDoc(collection(db, "agendamentos"), {
            data,
            hora: horaSelecionada,
            bloqueado: true
        });
    }

    fecharModal();
};

// mudar data
document.getElementById("data").addEventListener("change", escutarTempoReal);