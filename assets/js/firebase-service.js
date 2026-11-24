/**
 * DANALB Angola · DANALB EXPRESS — Firebase Cloud Integration
 * Sincronização em tempo real de Pedidos, Viatura (4 Ângulos) e Contactos
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração fornecida pelo cliente
const firebaseConfig = {
  apiKey: "AIzaSyBB6zZSmA4CZY9T0GI-1GJcQx0znXVeWNA",
  authDomain: "mari-burger.firebaseapp.com",
  projectId: "mari-burger",
  storageBucket: "mari-burger.firebasestorage.app",
  messagingSenderId: "495882474132",
  appId: "1:495882474132:web:88d2cfae94f30eb5b5da81",
  measurementId: "G-26BSGMPGDK"
};

let db = null;
let isConnected = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isConnected = true;
  console.log("✓ Firebase inicializado com sucesso para DANALB Angola");
} catch (err) {
  console.warn("Aviso Firebase:", err);
}

// Nomes das coleções no Firestore
const COLLECTIONS = {
  ORDERS: "danalb_pedidos",
  SETTINGS: "danalb_configuracoes",
  FLEET: "danalb_frota"
};

export const DanalbFirebase = {
  isAvailable() {
    return isConnected && db !== null;
  },

  /**
   * Criar novo pedido de transporte na nuvem
   */
  async createOrder(orderData) {
    if (!this.isAvailable()) {
      console.warn("Firebase indisponível, guardando apenas localmente.");
      return null;
    }
    try {
      const ordersCol = collection(db, COLLECTIONS.ORDERS);
      const payload = {
        ...orderData,
        criadoEm: serverTimestamp(),
        origemCriacao: "Website Oficial DANALB",
        atualizadoEm: serverTimestamp()
      };
      const docRef = await addDoc(ordersCol, payload);
      return docRef.id;
    } catch (err) {
      console.error("Erro ao gravar pedido no Firestore:", err);
      return null;
    }
  },

  /**
   * Escutar pedidos em tempo real (para o Painel Admin)
   */
  onOrdersChange(callback) {
    if (!this.isAvailable()) return () => {};
    try {
      const q = query(collection(db, COLLECTIONS.ORDERS), orderBy("criadoEm", "desc"));
      return onSnapshot(
        q,
        (snapshot) => {
          const orders = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            orders.push({
              id: docSnap.id,
              ...data,
              // Formatar timestamps para string legível
              criadoEmFormatado: data.criadoEm?.toDate ? data.criadoEm.toDate().toLocaleString("pt-AO") : ""
            });
          });
          callback(orders);
        },
        (err) => {
          console.warn("Erro no listener de pedidos Firestore:", err);
        }
      );
    } catch (err) {
      console.warn("Erro ao configurar snapshot de pedidos:", err);
      return () => {};
    }
  },

  /**
   * Atualizar status de um pedido no Firestore
   */
  async updateOrderStatus(orderId, newStatus) {
    if (!this.isAvailable()) return false;
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        atualizadoEm: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      return false;
    }
  },

  /**
   * Atualizar dados completos do pedido
   */
  async updateOrder(orderId, orderData) {
    if (!this.isAvailable()) return false;
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await updateDoc(orderRef, {
        ...orderData,
        atualizadoEm: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error("Erro ao atualizar pedido:", err);
      return false;
    }
  },

  /**
   * Eliminar pedido do Firestore
   */
  async deleteOrder(orderId) {
    if (!this.isAvailable()) return false;
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await deleteDoc(orderRef);
      return true;
    } catch (err) {
      console.error("Erro ao eliminar pedido:", err);
      return false;
    }
  },

  /**
   * Salvar os 4 ângulos e dados da viatura no Firestore
   */
  async saveVehicle(vehicleData) {
    if (!this.isAvailable()) return false;
    try {
      const vehicleRef = doc(db, COLLECTIONS.FLEET, "suzuki-alto-LDA-89-AE");
      await setDoc(
        vehicleRef,
        {
          ...vehicleData,
          atualizadoEm: serverTimestamp()
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error("Erro ao salvar viatura no Firestore:", err);
      return false;
    }
  },

  /**
   * Escutar alterações da viatura em tempo real
   */
  onVehicleChange(callback) {
    if (!this.isAvailable()) return () => {};
    try {
      const vehicleRef = doc(db, COLLECTIONS.FLEET, "suzuki-alto-LDA-89-AE");
      return onSnapshot(
        vehicleRef,
        (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data());
          }
        },
        (err) => {
          console.warn("Erro ao ouvir viatura Firestore:", err);
        }
      );
    } catch (err) {
      console.warn("Erro no listener de viatura:", err);
      return () => {};
    }
  },

  /**
   * Salvar contactos e definições da empresa no Firestore
   */
  async saveSettings(settingsData) {
    if (!this.isAvailable()) return false;
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, "geral");
      await setDoc(
        settingsRef,
        {
          ...settingsData,
          atualizadoEm: serverTimestamp()
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error("Erro ao salvar definições no Firestore:", err);
      return false;
    }
  },

  /**
   * Escutar definições da empresa em tempo real
   */
  onSettingsChange(callback) {
    if (!this.isAvailable()) return () => {};
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, "geral");
      return onSnapshot(
        settingsRef,
        (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data());
          }
        },
        (err) => {
          console.warn("Erro ao ouvir definições Firestore:", err);
        }
      );
    } catch (err) {
      console.warn("Erro no listener de definições:", err);
      return () => {};
    }
  }
};

// Tornar disponível globalmente no window para os scripts principais
window.DanalbFirebase = DanalbFirebase;
