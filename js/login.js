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
let primeiraCarga = true;

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

// 🔔 ALERTA
function mostrarAlerta(msg) {
    const el = document.getElementById("alerta");
    el.textContent = msg;
    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 3000);
}

// 🔥 TEMPO REAL
function escutarTempoReal() {
    const data = document.getElementById("data").value;

    const q = query(collection(db, "agendamentos"), where("data", "==", data));

    onSnapshot(q, (snap) => {

        if (!primeiraCarga && snap.docChanges().length > 0) {
            mostrarAlerta("🔔 Novo agendamento!");
        }

        primeiraCarga = false;

        agendamentos = [];
        snap.forEach(d => agendamentos.push({ id: d.id, ...d.data() }));

        renderizar();
    });
}

// RENDER
function renderizar() {
    const agenda = document.getElementById("agenda");
    agenda.innerHTML = "";

    // 💰 RESUMO
    let total = 0;
    let totalAtendimentos = 0;
    let pendentes = 0;

    agendamentos.forEach(a => {
        if (!a.bloqueado) {
            totalAtendimentos++;

            if (a.preco) total += Number(a.preco);

            if (a.status !== "confirmado") pendentes++;
        }
    });

    document.getElementById("totalDia").textContent = "R$" + total;
    document.getElementById("totalAgendamentos").textContent = totalAtendimentos;
    document.getElementById("pendentes").textContent = pendentes;

    // slots
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

                if (item.status === "confirmado") {
                    div.classList.add("confirmado");
                }

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
            item.bloqueado
                ? "Horário bloqueado"
                : `${item.nome} - ${item.servico} (R$${item.preco})`;
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

// WHATS CONFIRMAR
document.getElementById("btnWhats").onclick = async () => {
    if (!selecionado || !selecionado.telefone) return;

    const tel = selecionado.telefone.replace(/\D/g, "");

    const msg = encodeURIComponent(
        `Olá ${selecionado.nome}! 💖

Seu horário foi confirmado ✨

📅 ${selecionado.data}
⏰ ${selecionado.hora}
💅 ${selecionado.servico}`
    );

    const link = `https://wa.me/55${tel}?text=${msg}`;

    window.open(link, "_blank");

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

// BLOQUEAR
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