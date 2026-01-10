-- CreateEnum
CREATE TYPE "Cadencia" AS ENUM ('Semanal', 'Quinzenal', 'Mensal');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Atrasado', 'FalarHoje', 'EmDia', 'Convertido');

-- CreateEnum
CREATE TYPE "Temperatura" AS ENUM ('Frio', 'Morno', 'Quente');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('Urgente', 'Alerta', 'Atencao', 'Normal');

-- CreateEnum
CREATE TYPE "Origem" AS ENUM ('Instagram', 'Indicacao', 'Anuncio', 'Evento', 'WhatsApp', 'Organico', 'LinkedIn', 'Site', 'Outro');

-- CreateEnum
CREATE TYPE "TipoContato" AS ENUM ('Ligacao', 'WhatsApp', 'Email', 'Reuniao', 'Visita', 'Outro');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "origem" "Origem" NOT NULL,
    "telefone" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cadencia" "Cadencia" NOT NULL,
    "ultimoContato" TIMESTAMP(3),
    "proximoContato" TIMESTAMP(3),
    "status" "Status" NOT NULL DEFAULT 'EmDia',
    "temperatura" "Temperatura" NOT NULL DEFAULT 'Frio',
    "observacao" TEXT NOT NULL DEFAULT '',
    "prioridade" "Prioridade" NOT NULL DEFAULT 'Normal',
    "score" INTEGER NOT NULL DEFAULT 0,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConversao" TIMESTAMP(3),
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "nivel" TEXT NOT NULL DEFAULT 'Prospectador Iniciante',
    "conquistas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoContato" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoContato" NOT NULL,
    "temperatura" "Temperatura" NOT NULL,
    "status" "Status" NOT NULL,
    "resumo" TEXT NOT NULL,
    "proximoPasso" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoContato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoContato" "TipoContato" NOT NULL,
    "objetivo" TEXT NOT NULL,
    "conversa" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "interesseDemonstrado" TEXT NOT NULL,
    "objecoes" TEXT NOT NULL,
    "proximoPasso" TEXT NOT NULL,
    "proximoFollowUp" TIMESTAMP(3),
    "temperaturaAtualizada" "Temperatura" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gamificacao" (
    "id" TEXT NOT NULL,
    "pontosHoje" INTEGER NOT NULL DEFAULT 0,
    "pontosSemana" INTEGER NOT NULL DEFAULT 0,
    "pontosMes" INTEGER NOT NULL DEFAULT 0,
    "nivel" TEXT NOT NULL DEFAULT 'Prospectador Iniciante',
    "conquistas" TEXT[],
    "progressoDiario" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gamificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissaoDiaria" (
    "id" TEXT NOT NULL,
    "gamificacaoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "meta" INTEGER NOT NULL,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "pontos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissaoDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricasDiarias" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contatosFeitos" INTEGER NOT NULL DEFAULT 0,
    "atrasosResolvidos" INTEGER NOT NULL DEFAULT 0,
    "novosLeads" INTEGER NOT NULL DEFAULT 0,
    "leadsQuentesTrabalhados" INTEGER NOT NULL DEFAULT 0,
    "taxaRitmo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricasDiarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_temperatura_idx" ON "Lead"("temperatura");

-- CreateIndex
CREATE INDEX "Lead_prioridade_idx" ON "Lead"("prioridade");

-- CreateIndex
CREATE INDEX "HistoricoContato_leadId_idx" ON "HistoricoContato"("leadId");

-- CreateIndex
CREATE INDEX "HistoricoContato_data_idx" ON "HistoricoContato"("data");

-- CreateIndex
CREATE INDEX "Briefing_leadId_idx" ON "Briefing"("leadId");

-- CreateIndex
CREATE INDEX "Briefing_data_idx" ON "Briefing"("data");

-- CreateIndex
CREATE INDEX "MissaoDiaria_gamificacaoId_idx" ON "MissaoDiaria"("gamificacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricasDiarias_data_key" ON "MetricasDiarias"("data");

-- CreateIndex
CREATE INDEX "MetricasDiarias_data_idx" ON "MetricasDiarias"("data");

-- AddForeignKey
ALTER TABLE "HistoricoContato" ADD CONSTRAINT "HistoricoContato_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissaoDiaria" ADD CONSTRAINT "MissaoDiaria_gamificacaoId_fkey" FOREIGN KEY ("gamificacaoId") REFERENCES "Gamificacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
