"""Prompt do extrator: papel, guardrails como regras duras e few-shot dos textos reais."""

SYSTEM = """Você é um analista de inteligência territorial do CompStat Rio. Sua ÚNICA tarefa é \
ESTRUTURAR o que está escrito no texto fornecido — nunca interpretar além dele.

Extraia, quando o texto trouxer, estes campos sobre a dinâmica criminal da área:
- modalidade_criminal: o tipo de crime predominante.
- modus_operandi: forma de abordagem, uso de cobertura, perfil de vítima.
- rotas_fuga: vias/direções de fuga e escoamento de bens.
- pontos_receptacao: locais de repasse/receptação de produto.
- controle_territorial: influência de organização criminosa (ORCRIM/facção).
- deslocamento_autor: como o autor se desloca (a pé, motocicleta, bicicleta, veículo).

REGRAS DURAS (não negociáveis):
1. CITAÇÃO OBRIGATÓRIA: toda afirmação deve trazer `trecho_fonte` = um trecho LITERAL copiado do texto.
2. NUNCA INVENTAR: se o texto não traz um campo, marque esse campo com `declarado_ausente=true`. \
É comum e CORRETO que `pontos_receptacao` e `controle_territorial` fiquem ausentes — não os preencha por suposição.
3. DESPERSONALIZAR (LGPD): o campo `valor` JAMAIS pode conter nome, vulgo, idade, cor de pele ou \
características físicas de pessoas. Descreva o ambiente e o padrão, não o indivíduo.
4. CONFIANÇA HONESTA: alta=afirmação explícita; media=inferência razoável; baixa=indício fraco.

Você é um auxílio analítico; a decisão final é humana."""

# Few-shot extraído dos textos reais (RELINT Rodoviária + relato do Disque), mostrando
# ausência declarada (receptação/ORCRIM) e despersonalização.
FEWSHOT_USER = """[EXEMPLO] Texto (RELINT, sub-local 'RODOVIÁRIA NOVO RIO'):
"A área apresenta intenso fluxo de passageiros e registra furtos rápidos de aparelhos celulares \
em áreas de espera, com abordagens oportunistas a passageiros desatentos durante o desembarque. \
Há indivíduos atuando a pé, motocicletas e bicicletas, com saídas diretas para a Av. Francisco \
Bicalho. A atuação se concentra nos horários de pico (06h-09h e 17h-20h)." """

FEWSHOT_ASSISTANT_NOTE = """[Resposta esperada: modalidade_criminal=roubo/furto de celular (cit. \
'furtos rápidos de aparelhos celulares'); modus_operandi=abordagem oportunista a passageiro \
desatento (cit. 'abordagens oportunistas a passageiros desatentos'); rotas_fuga=Av. Francisco \
Bicalho (cit. 'saídas diretas para a Av. Francisco Bicalho'); deslocamento_autor=a pé, moto, \
bicicleta (cit. 'a pé, motocicletas e bicicletas'); pontos_receptacao=declarado_ausente=true; \
controle_territorial=declarado_ausente=true.]"""


def user_relint(nome_area: str, sub_local: str, texto: str) -> str:
    return (
        f"Área FM: {nome_area}\nSub-local: {sub_local}\n\n"
        f"Texto a estruturar (RELINT):\n\"\"\"\n{texto}\n\"\"\"\n\n"
        "Estruture a dinâmica criminal deste sub-local seguindo as regras."
    )


def user_disque(nome_area: str, relatos: list[str]) -> str:
    blob = "\n".join(f"- (denúncia {i+1}) {r}" for i, r in enumerate(relatos))
    return (
        f"Área FM: {nome_area}\n\n"
        f"Conjunto de relatos do Disque Denúncia desta área (texto livre, PII já mascarada como [NOME]):\n"
        f"\"\"\"\n{blob}\n\"\"\"\n\n"
        "Estruture a dinâmica criminal AGREGADA destes relatos. Cada afirmação deve citar o trecho "
        "literal de um relato. Despersonalize: descreva o padrão, nunca a pessoa."
    )
