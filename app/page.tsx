"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [busca, setBusca] = useState("");
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    categoria: "",
    quantidade: "",
    estoqueMinimo: "",
    precoUnitario: "",
  });

  const carregarDados = async () => {
    try {
      const resTodos = await axios.get("http://localhost:8080/api/produtos");
      const resCompras = await axios.get(
        "http://localhost:8080/api/produtos/lista-compras",
      );
      setProdutos(resTodos.data);
      setCompras(resCompras.data);
    } catch (err) {
      console.error("Erro na API Java:", err);
    }
  };

  // --- 1. LÓGICA: BUSCA EM TEMPO REAL ---
  const produtosFiltrados = produtos.filter(
    (p: any) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.categoria.toLowerCase().includes(busca.toLowerCase()),
  );

  // --- 2. LÓGICA: TOTALIZADOR DE PATRIMÔNIO ---
  const valorTotalEstoque = produtos.reduce(
    (acc, p: any) => acc + Number(p.quantidade) * Number(p.precoUnitario),
    0,
  );
  const totalItens = produtos.reduce(
    (acc, p: any) => acc + Number(p.quantidade),
    0,
  );

  // --- 3. LÓGICA: EXPORTAR PDF (CORREÇÃO TURBOPACK) ---
  const exportarPDF = () => {
    const doc = new jsPDF();

    // Título e Cabeçalho do PDF
    doc.setFontSize(18);
    doc.text("RELATÓRIO DE ESTOQUE - SALVADOR/BA", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);
    doc.text(
      `Patrimônio Total: ${valorTotalEstoque.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      14,
      28,
    );

    const tableColumn = ["Item", "Categoria", "Qtd", "Preço Unit.", "Subtotal"];
    const tableRows = produtosFiltrados.map((p: any) => [
      p.nome,
      p.categoria,
      p.quantidade,
      `R$ ${p.precoUnitario.toFixed(2)}`,
      `R$ ${(p.quantidade * p.precoUnitario).toFixed(2)}`,
    ]);

    // CHAMADA DIRETA DA FUNÇÃO (Evita o erro de doc.autoTable undefined)
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`estoque_geral_${new Date().getTime()}.pdf`);
  };

  const prepararEdicao = (item: any) => {
    setIdEditando(item.id);
    setNovoProduto({
      nome: item.nome,
      categoria: item.categoria,
      quantidade: item.quantidade.toString(),
      estoqueMinimo: item.estoqueMinimo.toString(),
      precoUnitario: item.precoUnitario.toString(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dados = {
      ...novoProduto,
      quantidade: Number(novoProduto.quantidade),
      estoqueMinimo: Number(novoProduto.estoqueMinimo),
      precoUnitario: Number(novoProduto.precoUnitario),
    };
    try {
      if (idEditando) {
        await axios.put(
          `http://localhost:8080/api/produtos/${idEditando}`,
          dados,
        );
      } else {
        await axios.post("http://localhost:8080/api/produtos", dados);
      }
      setNovoProduto({
        nome: "",
        categoria: "",
        quantidade: "",
        estoqueMinimo: "",
        precoUnitario: "",
      });
      setIdEditando(null);
      carregarDados();
    } catch (err) {
      alert("Erro ao salvar! Verifique se o Java está rodando na 8080.");
    }
  };

  const excluir = async (id: number) => {
    if (confirm("Deseja realmente excluir este item?")) {
      await axios.delete(`http://localhost:8080/api/produtos/${id}`);
      carregarDados();
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* DASHBOARD DE PATRIMÔNIO */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-slate-900">
              ESTOQUE<span className="text-blue-600">PRO</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Análise e Desenvolvimento de Sistemas - Salvador
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="bg-white p-5 rounded-3xl shadow-sm border-b-4 border-blue-500 flex-1 min-w-[180px]">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                Patrimônio Total
              </p>
              <p className="text-xl font-black text-blue-600">
                {valorTotalEstoque.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border-b-4 border-slate-900 flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                Total de Itens
              </p>
              <p className="text-xl font-black text-slate-900">{totalItens}</p>
            </div>
          </div>
        </header>

        {/* BUSCA E PDF */}
        <section className="mb-6 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="🔍 Filtrar por nome ou categoria..."
            className="flex-1 p-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button
            onClick={exportarPDF}
            className="bg-slate-900 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            📄 GERAR PDF
          </button>
        </section>

        {/* FORMULÁRIO */}
        <section
          className={`p-6 rounded-[2.5rem] mb-8 border-2 transition-all ${idEditando ? "border-blue-500 bg-blue-50" : "bg-white border-transparent shadow-sm"}`}
        >
          <h2 className="text-[10px] font-black uppercase mb-4 text-slate-400 tracking-widest">
            {idEditando ? "✏️ Modo Edição Ativo" : "➕ Cadastro de Mercadoria"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-6 gap-3"
          >
            <input
              type="text"
              placeholder="Item"
              className="p-3 rounded-xl border bg-slate-50 outline-none"
              value={novoProduto.nome}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, nome: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Cat."
              className="p-3 rounded-xl border bg-slate-50 outline-none"
              value={novoProduto.categoria}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, categoria: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Qtd"
              className="p-3 rounded-xl border bg-slate-50 outline-none"
              value={novoProduto.quantidade}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, quantidade: e.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Mín."
              className="p-3 rounded-xl border bg-slate-50 outline-none"
              value={novoProduto.estoqueMinimo}
              onChange={(e) =>
                setNovoProduto({
                  ...novoProduto,
                  estoqueMinimo: e.target.value,
                })
              }
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="R$ Unit"
              className="p-3 border-2 border-blue-100 rounded-xl font-bold outline-none"
              value={novoProduto.precoUnitario}
              onChange={(e) =>
                setNovoProduto({
                  ...novoProduto,
                  precoUnitario: e.target.value,
                })
              }
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white font-bold rounded-xl hover:bg-slate-900 transition-all uppercase text-[10px]"
            >
              {idEditando ? "Atualizar" : "Salvar"}
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ALERTAS */}
          <div className="lg:col-span-1">
            <div className="bg-red-500 p-6 rounded-[2.5rem] text-white shadow-xl">
              <h3 className="text-[10px] font-black uppercase mb-4 opacity-70">
                ⚠️ Reposição
              </h3>
              {compras.length === 0 && (
                <p className="text-xs italic opacity-60">Estoque completo.</p>
              )}
              {compras.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white/10 p-3 rounded-2xl mb-2 flex justify-between items-center text-[11px] font-bold"
                >
                  <span>{item.nome}</span>
                  <span className="bg-white text-red-500 px-2 py-0.5 rounded-lg">
                    FALTAM {item.estoqueMinimo - item.quantidade}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TABELA PRINCIPAL */}
          <div className="lg:col-span-3 bg-white p-6 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b">
                    <th className="pb-4">Produto / Categoria</th>
                    <th className="pb-4">Preço Unit.</th>
                    <th className="pb-4">Total</th>
                    <th className="pb-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {produtosFiltrados.map((item: any) => {
                    const hoje = new Date().toLocaleDateString("pt-BR");
                    const itemData = item.dataAtualizacao
                      ? new Date(item.dataAtualizacao).toLocaleDateString(
                          "pt-BR",
                        )
                      : "";
                    const isHoje = hoje === itemData;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-4">
                          <p className="font-bold text-slate-700">
                            {item.nome}
                          </p>
                          <p className="text-[9px] font-black text-slate-400 uppercase">
                            {item.categoria} • {item.quantidade} UN
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="font-black text-blue-600">
                            R$ {item.precoUnitario.toFixed(2)}
                          </p>
                          <p
                            className={`text-[8px] font-bold ${isHoje ? "text-green-500" : "text-orange-400"}`}
                          >
                            {isHoje ? "● ATUALIZADO HOJE" : "○ VALOR ANTIGO"}
                          </p>
                        </td>
                        <td className="py-4 font-mono text-xs font-bold text-slate-500">
                          R$ {(item.quantidade * item.precoUnitario).toFixed(2)}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => prepararEdicao(item)}
                              className="p-2 text-slate-300 hover:text-blue-500 transition-all text-lg"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => excluir(item.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all text-lg"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
