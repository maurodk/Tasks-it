# Instalação do Drag and Drop

Para ativar as funcionalidades de drag and drop, execute o seguinte comando:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Funcionalidades Implementadas

### 🎯 Drag and Drop
- **Mover entre quadros**: Arraste cartões entre subsetores ou colaboradores
- **Reordenar dentro do quadro**: Reorganize a posição dos cartões no mesmo quadro
- **Feedback visual**: Overlay durante o arraste com rotação e escala

### 🔄 Filtros de Organização
- **Ordem Alfabética** (ícone A-Z): Organiza atividades por título
- **Ordem de Criação** (ícone relógio): Organiza por data de criação

### 📱 Responsividade
- Funciona em desktop e mobile
- Sensores otimizados para touch e mouse
- Distância mínima de ativação para evitar conflitos

## Componentes Atualizados
- `SubsectorCards.tsx` - Drag and drop entre subsetores
- `CollaboratorCards.tsx` - Drag and drop entre colaboradores  
- `DraggableActivityCard.tsx` - Componente de card draggable
- `useActivityOperations.ts` - Atualização de atividades

## Como Usar
1. Clique e segure um cartão de atividade
2. Arraste para outro quadro para mover entre subsetores/colaboradores
3. Arraste dentro do mesmo quadro para reordenar
4. Use os botões de filtro para organizar as atividades