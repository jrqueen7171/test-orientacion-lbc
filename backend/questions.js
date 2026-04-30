// Banco de preguntas del Test de Orientación.
// Datos sensibles: incluye `correct`, `scores` por familia y explicaciones.
// NUNCA enviar este módulo completo al cliente — usar getQuestionsForClient().

const QUESTIONS = [
{id:1,section:"soft",skill:"puntualidad",text:"Tienes una reunión importante a las 9:00. ¿Qué haces?",
options:[{text:"Llego 10 minutos antes para preparar todo",scores:{admin:3,comercio:2,obra:2,electro:2,textil:1},correct:true},{text:"Llego justo a la hora, ni un minuto más",scores:{admin:1,comercio:1,obra:1,electro:1,textil:1},correct:false},{text:"Si me retraso 5 minutos no pasa nada",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Depende de lo importante que sea la reunión",scores:{admin:0,comercio:1,obra:0,electro:0,textil:1},correct:false}],
idealExplanation:"La puntualidad demuestra respeto por el tiempo de los demás y profesionalidad. Llegar antes te permite prepararte y transmitir seriedad.",
wrongExplanation:"Llegar tarde genera imagen de falta de compromiso. Consejo: planifica tu ruta con margen, prepara lo necesario la noche anterior y usa alarmas."},

{id:3,section:"soft",skill:"puntualidad",text:"Tienes un trabajo que entregar mañana y aún te queda bastante. ¿Qué haces?",
options:[{text:"Organizo lo que falta, priorizo y trabajo hasta terminarlo con calidad",scores:{admin:3,comercio:1,obra:2,electro:2,textil:1},correct:true},{text:"Hago lo mínimo para entregar algo a tiempo",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Pido una prórroga al profesor/jefe",scores:{admin:1,comercio:1,obra:1,electro:1,textil:1},correct:false},{text:"Copio partes de internet para acabar antes",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"La gestión del tiempo y el compromiso con la calidad son esenciales. Planificar lo pendiente y trabajar con método demuestra madurez profesional.",
wrongExplanation:"Entregar algo mediocre o copiar perjudica tu aprendizaje. Consejo: usa técnicas como Pomodoro (25 min trabajo + 5 descanso), divide tareas grandes en partes pequeñas."},

{id:4,section:"soft",skill:"puntualidad",text:"¿Cómo planificas tu semana de estudio o trabajo?",
options:[{text:"Uso agenda o calendario con horarios fijos y objetivos diarios",scores:{admin:3,comercio:1,obra:2,electro:1,textil:0},correct:true},{text:"Tengo una idea general pero no anoto nada",scores:{admin:0,comercio:1,obra:0,electro:1,textil:1},correct:false},{text:"Estudio cuando me apetece o cuando hay examen",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Hago lo que vaya surgiendo cada día",scores:{admin:0,comercio:1,obra:0,electro:0,textil:1},correct:false}],
idealExplanation:"La planificación estructurada multiplica tu productividad. Usar herramientas concretas te da control sobre tu tiempo.",
wrongExplanation:"Sin planificación pierdes tiempo y acumulas estrés. Consejo: cada domingo planifica la semana en 15 min. Herramientas gratuitas: Google Calendar, Notion, Trello."},

{id:5,section:"soft",skill:"puntualidad",text:"Te comprometes a terminar tu parte de un proyecto grupal para el viernes. El jueves ves que no llegas. ¿Qué haces?",
options:[{text:"Aviso al grupo inmediatamente, explico la situación y propongo solución",scores:{admin:2,comercio:3,obra:2,electro:2,textil:1},correct:true},{text:"Intento hacerlo todo corriendo la noche del jueves",scores:{admin:0,comercio:0,obra:0,electro:1,textil:1},correct:false},{text:"No digo nada y espero que no se note mucho",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Pido a otro compañero que haga mi parte",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"La comunicación anticipada de problemas permite al equipo reorganizarse. Proponer soluciones demuestra responsabilidad y liderazgo.",
wrongExplanation:"Ocultar un retraso perjudica a todo el equipo. Consejo: en cuanto detectes un problema, comunícalo. La transparencia genera confianza."},

{id:7,section:"soft",skill:"asertividad",text:"Un compañero se atribuye el mérito de una idea tuya. ¿Qué haces?",
options:[{text:"Hablo con él/ella directamente: 'Esa idea la propuse yo, ¿lo recuerdas?'",scores:{admin:2,comercio:2,obra:2,electro:2,textil:2},correct:true},{text:"Lo dejo pasar, no merece la pena discutir",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Se lo cuento a otros para que sepan la verdad",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Lo denuncio formalmente al profesor o superior",scores:{admin:1,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Reclamar lo tuyo de forma directa y respetuosa es asertividad pura. No es pelear sino poner límites claros.",
wrongExplanation:"Callarte refuerza que te quiten méritos. Hablar a espaldas genera desconfianza. Consejo: documenta tus ideas (emails, notas)."},

{id:9,section:"soft",skill:"asertividad",text:"En una discusión grupal, todos opinan diferente a ti pero tú tienes datos que apoyan tu postura. ¿Qué haces?",
options:[{text:"Presento mis datos con respeto: 'Entiendo vuestro punto, pero los datos muestran que...'",scores:{admin:3,comercio:2,obra:3,electro:3,textil:1},correct:true},{text:"Cambio de opinión para no ser el/la diferente",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Insisto en mi postura hasta que me den la razón",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Me callo y pienso que ya se darán cuenta",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Defender una postura basada en datos, reconociendo las otras opiniones, es asertividad madura y argumentación fundamentada.",
wrongExplanation:"Ceder por presión social es conformismo. Insistir sin escuchar es agresividad. Consejo: usa frases puente como 'Entiendo lo que dices y además...'"},

{id:10,section:"soft",skill:"asertividad",text:"¿Cómo pides ayuda cuando la necesitas?",
options:[{text:"Identifico exactamente qué necesito y pido de forma clara y directa",scores:{admin:2,comercio:2,obra:2,electro:2,textil:2},correct:true},{text:"Espero a que alguien se dé cuenta de que necesito ayuda",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Doy muchas vueltas antes de pedir, me da vergüenza",scores:{admin:0,comercio:0,obra:0,electro:0,textil:1},correct:false},{text:"Solo pido ayuda cuando ya es demasiado tarde",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Saber pedir ayuda de forma clara y oportuna es una competencia profesional, no una debilidad.",
wrongExplanation:"No pedir ayuda por orgullo o vergüenza lleva a errores. Consejo: sé específico/a: no digas 'necesito ayuda', di 'necesito que me expliques cómo funciona X'."},

{id:13,section:"soft",skill:"don_gentes",text:"¿Cómo te describirían tus amigos o compañeros?",
options:[{text:"Cercano/a, buen/a comunicador/a y siempre dispuesto/a a ayudar",scores:{admin:1,comercio:3,obra:1,electro:1,textil:2},correct:true},{text:"Reservado/a pero fiable cuando me necesitan",scores:{admin:2,comercio:0,obra:2,electro:2,textil:0},correct:false},{text:"Divertido/a pero a veces poco serio/a",scores:{admin:0,comercio:1,obra:0,electro:0,textil:1},correct:false},{text:"Independiente, voy a lo mío",scores:{admin:0,comercio:0,obra:1,electro:1,textil:0},correct:false}],
idealExplanation:"Cercanía, comunicación y disponibilidad definen un profesional con excelente don de gentes, esencial en ventas y gestión de equipos.",
wrongExplanation:"Ser reservado es válido pero limita oportunidades de networking. Consejo: practica el interés genuino por los demás."},

{id:15,section:"soft",skill:"don_gentes",text:"¿Cómo reaccionas ante alguien con opiniones muy diferentes a las tuyas?",
options:[{text:"Muestro curiosidad genuina: '¿Por qué piensas eso? Me interesa entenderlo'",scores:{admin:2,comercio:3,obra:1,electro:1,textil:2},correct:true},{text:"Respeto su opinión pero no la comento",scores:{admin:1,comercio:0,obra:1,electro:1,textil:0},correct:false},{text:"Intento convencerle de que mi postura es la correcta",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Evito el tema para no crear conflicto",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"La curiosidad genuina ante la diversidad de opiniones es la base de relaciones profesionales saludables.",
wrongExplanation:"Evitar temas no fomenta el diálogo. Consejo: practica la escucha activa, haz preguntas abiertas. El respeto no implica acuerdo."},

{id:16,section:"soft",skill:"resolucion_conflictos",text:"Dos compañeros de tu equipo discuten y el proyecto se paraliza. ¿Qué haces?",
options:[{text:"Hablo con cada uno por separado, entiendo sus posturas y propongo un acuerdo",scores:{admin:2,comercio:3,obra:2,electro:1,textil:1},correct:true},{text:"Espero a que se les pase y sigan trabajando",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Tomo partido por quien creo que tiene razón",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Se lo cuento al profesor/jefe para que lo resuelva",scores:{admin:1,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"La mediación es una habilidad de liderazgo muy valiosa. Escuchar ambas partes en privado y buscar el interés común demuestra madurez emocional.",
wrongExplanation:"Esperar no resuelve nada; tomar partido polariza más. Consejo: usa la técnica 'escuchar-validar-proponer'."},

{id:18,section:"soft",skill:"resolucion_conflictos",text:"En tu equipo hay una persona que siempre impone sus ideas y no escucha. ¿Cómo lo gestionas?",
options:[{text:"En privado le explico cómo su actitud afecta al equipo, con ejemplos concretos",scores:{admin:2,comercio:2,obra:2,electro:2,textil:2},correct:true},{text:"Le ignoro y hago mi parte del trabajo",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Le planto cara delante de todos",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Me quejo al profesor/jefe",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Abordar problemas de comportamiento en privado, con datos concretos, es resolución de conflictos en estado puro.",
wrongExplanation:"Ignorar el problema lo empeora. Confrontar en público humilla. Consejo: usa 'Situación + Impacto + Petición'."},

{id:19,section:"soft",skill:"resolucion_conflictos",text:"Has cometido un error que afecta al trabajo de otros. ¿Cómo lo manejas?",
options:[{text:"Lo reconozco inmediatamente, pido disculpas y propongo cómo repararlo",scores:{admin:3,comercio:2,obra:3,electro:2,textil:1},correct:true},{text:"Intento arreglarlo sin que nadie se entere",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Busco si alguien más contribuyó al error para compartir culpa",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Espero a que me lo digan antes de admitirlo",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Reconocer errores con rapidez y proponer soluciones genera confianza y respeto en cualquier sector profesional.",
wrongExplanation:"Ocultar errores puede tener consecuencias graves. Consejo: practica 'Error + Disculpa + Plan de acción'. Los errores son oportunidades de aprendizaje."},

{id:20,section:"soft",skill:"resolucion_conflictos",text:"Dos personas de tu entorno tienen un conflicto que te afecta indirectamente. ¿Qué haces?",
options:[{text:"Les propongo hablar los tres juntos, facilito el diálogo pero no tomo partido",scores:{admin:1,comercio:3,obra:1,electro:1,textil:2},correct:true},{text:"Me mantengo neutral y no me meto",scores:{admin:1,comercio:0,obra:1,electro:1,textil:0},correct:false},{text:"Apoyo al que creo que tiene razón",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Me aparto del conflicto aunque me perjudique",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Facilitar el diálogo sin tomar partido es mediación profesional. Crear el espacio para que se escuchen es una competencia muy demandada.",
wrongExplanation:"Mantenerse al margen cuando te afecta es evitación. Consejo: aprende técnicas de mediación. Pregunta '¿Qué necesitas?' en lugar de '¿Quién tiene razón?'"},

{id:23,section:"soft",skill:"negociacion",text:"En un proyecto grupal, quieres hacer una parte que otro compañero también quiere. ¿Cómo lo resuelves?",
options:[{text:"Propongo dividir esa parte o alternar, buscando que ambos aportemos",scores:{admin:1,comercio:2,obra:2,electro:2,textil:2},correct:true},{text:"Le cedo mi preferencia para evitar conflicto",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Argumento por qué yo debería hacerlo",scores:{admin:1,comercio:1,obra:1,electro:1,textil:0},correct:false},{text:"Le pido al profesor que decida",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Buscar soluciones creativas donde ambas partes ganen es la esencia de la negociación colaborativa.",
wrongExplanation:"Ceder siempre frustra. Imponer genera resentimiento. Consejo: ante un conflicto de intereses, piensa en opciones creativas."},

{id:26,section:"soft",skill:"organizacion",text:"¿Cómo organizas tus materiales de estudio o trabajo?",
options:[{text:"Digital y físicamente ordenado: carpetas etiquetadas, archivos con nombre lógico",scores:{admin:3,comercio:1,obra:2,electro:2,textil:0},correct:true},{text:"Tengo un orden mental pero mi escritorio es un caos",scores:{admin:0,comercio:1,obra:0,electro:1,textil:1},correct:false},{text:"Solo ordeno cuando busco algo y no lo encuentro",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Lo organizo de forma visual: colores, post-its, mood boards",scores:{admin:0,comercio:1,obra:0,electro:0,textil:3},correct:false}],
idealExplanation:"La organización sistemática ahorra tiempo y reduce errores. Es especialmente valorada en administración e ingeniería.",
wrongExplanation:"El 'orden mental' falla cuando hay mucho volumen. Consejo: convención de nombres (FECHA_ASIGNATURA_Tema) y 5 min al día para ordenar."},

{id:29,section:"soft",skill:"creatividad",text:"Si pudieras crear algo desde cero, ¿qué elegirías?",
options:[{text:"Un sistema de gestión empresarial eficiente",scores:{admin:3,comercio:0,obra:1,electro:2,textil:0},correct:false},{text:"Una campaña de marketing viral o tienda online",scores:{admin:0,comercio:3,obra:0,electro:0,textil:1},correct:false},{text:"Un puente, edificio sostenible o instalación técnica",scores:{admin:0,comercio:0,obra:3,electro:2,textil:0},correct:false},{text:"Una colección de moda o vestuario para una película",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3},correct:false}],
idealExplanation:"No hay respuesta correcta: tu elección refleja tus verdaderas pasiones. La motivación intrínseca es el mejor predictor de éxito profesional.",
wrongExplanation:"No hay respuesta incorrecta. Consejo: reflexiona sobre qué te haría levantarte motivado/a cada lunes. Esa es tu vocación."},

{id:30,section:"soft",skill:"creatividad",text:"¿Cómo generas ideas nuevas?",
options:[{text:"Analizo datos y busco patrones o ineficiencias",scores:{admin:3,comercio:1,obra:2,electro:2,textil:0},correct:false},{text:"Observo tendencias, competencia y lo que funciona en otros sectores",scores:{admin:1,comercio:3,obra:0,electro:0,textil:2},correct:false},{text:"Experimento con tecnología y materiales",scores:{admin:0,comercio:0,obra:2,electro:3,textil:2},correct:false},{text:"Dibujo, boceto y dejo volar la imaginación",scores:{admin:0,comercio:0,obra:1,electro:0,textil:3},correct:false}],
idealExplanation:"No hay forma 'correcta' de generar ideas. Cada estilo creativo apunta a una familia profesional. Conocerte es clave.",
wrongExplanation:"No hay respuesta incorrecta. Consejo: identifica tu estilo creativo natural y poténcialo."},

{id:31,section:"soft",skill:"trabajo_equipo",text:"¿Cuál es tu rol natural en un equipo?",
options:[{text:"Organizo tareas, plazos y me aseguro de que todo fluya",scores:{admin:3,comercio:1,obra:2,electro:1,textil:0},correct:false},{text:"Motivo, comunico y mantengo al equipo unido",scores:{admin:1,comercio:3,obra:0,electro:0,textil:1},correct:false},{text:"Me encargo de la parte técnica o práctica",scores:{admin:0,comercio:0,obra:2,electro:3,textil:2},correct:false},{text:"Aporto ideas originales y la visión creativa",scores:{admin:0,comercio:1,obra:1,electro:0,textil:3},correct:false}],
idealExplanation:"Cada rol es igualmente valioso. Los mejores equipos tienen diversidad de roles: organizadores, comunicadores, técnicos y creativos.",
wrongExplanation:"No hay respuesta incorrecta. Consejo: conoce la teoría de roles de equipo de Belbin y trabaja también tus roles secundarios."},

{id:32,section:"soft",skill:"trabajo_equipo",text:"Un compañero tiene dificultades con su parte del trabajo. ¿Qué haces?",
options:[{text:"Le ofrezco ayuda específica sin hacerle sentir mal y respetando su autonomía",scores:{admin:2,comercio:2,obra:2,electro:2,textil:2},correct:true},{text:"Hago su parte para que el proyecto no sufra",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Le digo que se esfuerce más",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Se lo comento al responsable",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Ayudar sin anular al otro es la base del verdadero trabajo en equipo. Ofrecer ayuda concreta genera compañerismo real.",
wrongExplanation:"Hacerle su trabajo no le ayuda a crecer. Consejo: ofrece ayuda específica ('¿Quieres que repasemos juntos X?') en lugar de genérica."},

{id:33,section:"soft",skill:"trabajo_equipo",text:"¿Cómo celebras un éxito del equipo?",
options:[{text:"Reconozco la aportación de cada persona y celebramos juntos",scores:{admin:2,comercio:3,obra:1,electro:1,textil:2},correct:true},{text:"Me alegro internamente pero no lo expreso mucho",scores:{admin:1,comercio:0,obra:1,electro:1,textil:0},correct:false},{text:"Me centro en el siguiente proyecto",scores:{admin:0,comercio:0,obra:1,electro:1,textil:0},correct:false},{text:"Me atribuyo el mérito si fui quien más trabajó",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"Reconocer aportaciones individuales y celebrar colectivamente fortalece la cohesión y la motivación del equipo.",
wrongExplanation:"No celebrar desmotiva al equipo. Consejo: di 'Hemos conseguido' en lugar de 'He conseguido'. Nombra aportaciones concretas de cada persona."},

{id:34,section:"soft",skill:"adaptabilidad",text:"Te cambian de grupo/proyecto de repente. ¿Cómo reaccionas?",
options:[{text:"Me adapto rápido: conozco al nuevo equipo, entiendo el contexto y me pongo al día",scores:{admin:1,comercio:3,obra:1,electro:2,textil:2},correct:true},{text:"Me cuesta pero intento adaptarme poco a poco",scores:{admin:1,comercio:1,obra:1,electro:1,textil:1},correct:false},{text:"Me quejo, estaba a gusto donde estaba",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Acepto pero no me implico tanto como antes",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"La adaptabilidad rápida es una de las competencias más demandadas del siglo XXI.",
wrongExplanation:"Resistir el cambio te perjudica. Consejo: pregúntate '¿Qué puedo aprender aquí?' en lugar de '¿Qué he perdido?'"},

{id:35,section:"soft",skill:"adaptabilidad",text:"Te piden aprender una herramienta digital nueva que nunca has usado. ¿Qué haces?",
options:[{text:"La instalo, busco tutoriales y empiezo a practicar de inmediato",scores:{admin:1,comercio:1,obra:2,electro:3,textil:1},correct:true},{text:"Busco un manual completo antes de tocar nada",scores:{admin:2,comercio:0,obra:1,electro:1,textil:0},correct:false},{text:"Le pido a alguien que me enseñe personalmente",scores:{admin:0,comercio:2,obra:0,electro:0,textil:1},correct:false},{text:"Intento evitarla y usar lo que ya sé",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false}],
idealExplanation:"La proactividad en el aprendizaje digital es imprescindible. Combinar exploración práctica con tutoriales es lo más eficiente.",
wrongExplanation:"Evitar herramientas nuevas te deja atrás. Consejo: la mejor forma de aprender software es usándolo. Empieza con un proyecto sencillo."},

{id:36,section:"soft",skill:"pensamiento_critico",text:"Ves una oferta de trabajo que promete 3000€/mes sin experiencia. ¿Qué piensas?",
options:[{text:"Investigo la empresa, busco opiniones y desconfío si no hay datos verificables",scores:{admin:3,comercio:2,obra:2,electro:2,textil:1},correct:true},{text:"Aplico rápidamente, es una gran oportunidad",scores:{admin:0,comercio:0,obra:0,electro:0,textil:0},correct:false},{text:"Pregunto a amigos si les parece buena",scores:{admin:0,comercio:1,obra:0,electro:0,textil:0},correct:false},{text:"La ignoro, seguro que es estafa",scores:{admin:1,comercio:0,obra:1,electro:1,textil:0},correct:false}],
idealExplanation:"El pensamiento crítico implica verificar fuentes antes de actuar. Investigar protege tu seguridad laboral y económica.",
wrongExplanation:"Actuar sin verificar puede llevarte a estafas. Ignorar sin investigar puede hacerte perder oportunidades. Consejo: verifica CIF, busca en LinkedIn, consulta Registro Mercantil."},

{id:38,section:"tecnica",text:"¿Qué asignatura de la ESO te resultaba más interesante?",
options:[{text:"Economía o Matemáticas aplicadas",scores:{admin:3,comercio:2,obra:1,electro:0,textil:0}},{text:"Lengua, Idiomas o Ciencias Sociales",scores:{admin:1,comercio:3,obra:0,electro:0,textil:1}},{text:"Tecnología, Física o Dibujo Técnico",scores:{admin:0,comercio:0,obra:3,electro:3,textil:0}},{text:"Educación Plástica y Visual",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"Tu asignatura favorita indica tu inclinación profesional natural.",wrongExplanation:"Tu respuesta es válida y orienta hacia una familia profesional concreta."},

{id:39,section:"tecnica",text:"¿Dónde te gustaría hacer prácticas?",
options:[{text:"Una asesoría fiscal, un banco o RRHH",scores:{admin:3,comercio:0,obra:0,electro:0,textil:0}},{text:"Un centro comercial, agencia de marketing o empresa logística",scores:{admin:0,comercio:3,obra:0,electro:0,textil:0}},{text:"Una constructora, estudio de ingeniería o empresa de telecomunicaciones",scores:{admin:0,comercio:0,obra:3,electro:3,textil:0}},{text:"Un taller de costura, atelier de moda o productora de cine",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"El IES ofrece prácticas en empresas locales y también en el extranjero a través de Erasmus+.",wrongExplanation:"Habla con el Departamento de Orientación para conocer empresas colaboradoras."},

{id:41,section:"tecnica",text:"¿Te gusta trabajar con las manos?",
options:[{text:"No mucho, prefiero ordenador y documentos",scores:{admin:3,comercio:1,obra:0,electro:0,textil:0}},{text:"Un poco, montando expositores o decoraciones",scores:{admin:0,comercio:3,obra:0,electro:0,textil:1}},{text:"Sí, soldar, cablear, montar, construir",scores:{admin:0,comercio:0,obra:2,electro:3,textil:1}},{text:"Sí, coser, cortar, moldear y crear prendas",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"Tu relación con el trabajo manual indica claramente tu familia profesional.",wrongExplanation:"Cada perfil manual o digital encaja con una familia diferente."},

{id:42,section:"tecnica",text:"¿Cómo te llevas con las matemáticas?",
options:[{text:"Me gustan: porcentajes, contabilidad, estadística",scores:{admin:3,comercio:1,obra:1,electro:1,textil:0}},{text:"Me defiendo si tienen aplicación práctica",scores:{admin:1,comercio:2,obra:1,electro:1,textil:1}},{text:"Me gustan las aplicadas: cálculos, mediciones",scores:{admin:0,comercio:0,obra:3,electro:3,textil:0}},{text:"No son lo mío, prefiero expresión visual",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"Cada ciclo te enseña las matemáticas que necesitas. No es necesario ser un experto.",wrongExplanation:"Si las matemáticas no son tu fuerte, Textil y Comercio requieren menos cálculo."},

{id:43,section:"tecnica",text:"¿Cómo ves el sector de los drones profesionales?",
options:[{text:"Interesante para topografía y control de obras",scores:{admin:0,comercio:0,obra:3,electro:2,textil:0}},{text:"Muy atractivo, me gustaría pilotarlos",scores:{admin:0,comercio:0,obra:1,electro:3,textil:0}},{text:"Útil para logística y entregas",scores:{admin:1,comercio:3,obra:0,electro:1,textil:0}},{text:"Curioso pero no es lo que más me atrae",scores:{admin:1,comercio:0,obra:0,electro:0,textil:2}}],
idealExplanation:"El IES ofrece un Curso de Especialización en Drones, formación pionera con gran demanda laboral.",wrongExplanation:"El CE en Drones del IES es una especialización innovadora que complementa varias familias."},

{id:44,section:"tecnica",text:"¿Qué tipo de proyecto fin de ciclo te gustaría hacer?",
options:[{text:"Un plan de empresa con estudio de viabilidad financiera",scores:{admin:3,comercio:2,obra:0,electro:0,textil:0}},{text:"Un plan de marketing y lanzamiento de producto",scores:{admin:0,comercio:3,obra:0,electro:0,textil:1}},{text:"Un proyecto de obra civil o instalación técnica completa",scores:{admin:0,comercio:0,obra:3,electro:3,textil:0}},{text:"Una colección de moda con desfile",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"El proyecto final refleja tu vocación. En el Aula de Emprendimiento del IES puedes empezar a desarrollar ideas desde primer curso.",wrongExplanation:"Visita el Aula de Emprendimiento del IES para ver proyectos reales de alumnos."},

{id:45,section:"tecnica",text:"¿Te interesa la sostenibilidad y el medio ambiente?",
options:[{text:"Sí, en la gestión responsable de empresas (RSC)",scores:{admin:3,comercio:1,obra:0,electro:0,textil:0}},{text:"Sí, comercio justo y consumo responsable",scores:{admin:0,comercio:3,obra:0,electro:0,textil:1}},{text:"Sí, energías renovables e instalaciones eficientes",scores:{admin:0,comercio:0,obra:2,electro:3,textil:0}},{text:"Sí, moda sostenible y textiles ecológicos",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"La sostenibilidad es transversal a todas las familias profesionales.",wrongExplanation:"Investiga cómo tu familia favorita contribuye a los ODS de la ONU."},

{id:46,section:"tecnica",text:"¿Qué valor del IES Luis Bueno Crespo te atrae más?",
options:[{text:"Los ciclos bilingües en inglés",scores:{admin:3,comercio:2,obra:2,electro:1,textil:1}},{text:"Las oportunidades Erasmus+ en el extranjero",scores:{admin:1,comercio:2,obra:1,electro:1,textil:2}},{text:"La certificación MikroTik Academy y tecnología punta",scores:{admin:0,comercio:0,obra:1,electro:3,textil:0}},{text:"El Aula de Emprendimiento y el Aula ATECA",scores:{admin:1,comercio:2,obra:1,electro:1,textil:2}}],
idealExplanation:"El IES ofrece bilingüismo, Erasmus+, MikroTik Academy, Aula ATECA y Aula de Emprendimiento. Son ventajas competitivas reales.",wrongExplanation:"Aprovecha al máximo los recursos del centro. El bilingüismo y Erasmus+ multiplican tus oportunidades."},

{id:47,section:"tecnica",text:"¿Cómo te imaginas profesionalmente en 5 años?",
options:[{text:"Gestionando un departamento administrativo o financiero",scores:{admin:3,comercio:0,obra:0,electro:0,textil:0}},{text:"Dirigiendo un equipo de ventas o mi propia tienda online",scores:{admin:0,comercio:3,obra:0,electro:0,textil:0}},{text:"En un proyecto de construcción o instalaciones avanzadas",scores:{admin:0,comercio:0,obra:3,electro:2,textil:0}},{text:"Con mi propio taller de moda o en producción de espectáculos",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"Tu visión a 5 años es uno de los mejores indicadores de tu familia profesional.",wrongExplanation:"Ten un plan pero sé flexible. La FP te da base sólida y el GS da acceso a la universidad."},

{id:48,section:"tecnica",text:"¿Qué tipo de error laboral te preocuparía más?",
options:[{text:"Un error en un balance contable o declaración fiscal",scores:{admin:3,comercio:0,obra:1,electro:0,textil:0}},{text:"Perder un cliente importante por mala atención",scores:{admin:0,comercio:3,obra:0,electro:0,textil:0}},{text:"Un fallo de seguridad eléctrica o defecto estructural",scores:{admin:0,comercio:0,obra:3,electro:3,textil:0}},{text:"Entregar una prenda con acabado deficiente",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"El tipo de error que más te preocupa indica dónde pones tu máximo estándar de calidad.",wrongExplanation:"En todas las profesiones hay margen de error, pero la prevención es clave. El IES lo cubre en FOL."},

{id:49,section:"tecnica",text:"¿Qué sector tiene más futuro en Andalucía según tu criterio?",
options:[{text:"Servicios financieros y gestión empresarial",scores:{admin:3,comercio:1,obra:0,electro:0,textil:0}},{text:"Comercio electrónico y logística internacional",scores:{admin:0,comercio:3,obra:0,electro:0,textil:0}},{text:"Construcción sostenible, telecomunicaciones y energías renovables",scores:{admin:0,comercio:0,obra:3,electro:3,textil:0}},{text:"Moda flamenca, artesanía textil y espectáculos",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"Andalucía ofrece oportunidades en todos estos sectores. La clave es elegir lo que te apasione.",wrongExplanation:"Investiga el tejido empresarial de Granada. El IES tiene convenios con empresas locales para FCT."},

{id:50,section:"tecnica",text:"Última pregunta: ¿qué frase te define mejor?",
options:[{text:"\"Cada céntimo cuenta y cada documento importa\"",scores:{admin:3,comercio:0,obra:0,electro:0,textil:0}},{text:"\"Si sabes conectar con la gente, todo es posible\"",scores:{admin:0,comercio:3,obra:0,electro:0,textil:0}},{text:"\"Construyo y conecto el mundo que nos rodea\"",scores:{admin:0,comercio:0,obra:2,electro:3,textil:0}},{text:"\"La moda es arte que se viste\"",scores:{admin:0,comercio:0,obra:0,electro:0,textil:3}}],
idealExplanation:"Tu frase-identidad revela tu esencia profesional. No hay correcta ni incorrecta.",wrongExplanation:"Si ninguna te representa, quizá tengas perfil mixto. Explora ciclos de dos familias."},
];

const FAMILY_KEYS = ['admin', 'comercio', 'obra', 'electro', 'textil'];
const FAMILY_NAMES = {
  admin: 'Administración',
  comercio: 'Comercio',
  obra: 'Obra Civil',
  electro: 'Electricidad',
  textil: 'Textil',
};
const SOFT_SKILLS = ['puntualidad','asertividad','don_gentes','resolucion_conflictos','negociacion','organizacion','creatividad','trabajo_equipo','adaptabilidad','pensamiento_critico'];

function getQuestionsForClient() {
  // Strip correct flag, scores breakdown, and explanations.
  return QUESTIONS.map(q => ({
    id: q.id,
    section: q.section,
    skill: q.skill,
    text: q.text,
    options: q.options.map(o => ({ text: o.text })),
  }));
}

function gradeAnswers(answers) {
  const ans = answers || {};
  const totals = {}; const max = {};
  FAMILY_KEYS.forEach(f => { totals[f] = 0; max[f] = 0; });

  const softTotals = {};
  SOFT_SKILLS.forEach(k => { softTotals[k] = { s: 0, m: 0, correct: 0, total: 0 }; });

  let totalCorrect = 0;
  let totalGraded = 0;
  const feedback = [];

  for (const q of QUESTIONS) {
    FAMILY_KEYS.forEach(f => {
      max[f] += Math.max(...q.options.map(o => o.scores[f] || 0));
    });

    const userAnswerIdx = ans[q.id];
    const hasUserAnswer = userAnswerIdx !== undefined && userAnswerIdx !== null;
    const userOption = hasUserAnswer ? q.options[userAnswerIdx] : null;
    const hasCorrectFlag = q.options.some(o => o.correct);

    if (userOption) {
      FAMILY_KEYS.forEach(f => { totals[f] += userOption.scores[f] || 0; });
    }

    if (q.section === 'soft' && q.skill && softTotals[q.skill]) {
      softTotals[q.skill].total += 1;
      const optMax = Math.max(...q.options.map(o => Object.values(o.scores).reduce((a, b) => a + b, 0)));
      softTotals[q.skill].m += optMax;
      if (userOption) {
        softTotals[q.skill].s += Object.values(userOption.scores).reduce((a, b) => a + b, 0);
        if (userOption.correct) softTotals[q.skill].correct += 1;
      }
    }

    if (hasCorrectFlag) {
      totalGraded += 1;
      if (userOption && userOption.correct) totalCorrect += 1;
    }

    feedback.push({
      id: q.id,
      section: q.section,
      skill: q.skill || null,
      text: q.text,
      userAnswerIdx: hasUserAnswer ? userAnswerIdx : null,
      userAnswerText: userOption ? userOption.text : null,
      correctAnswerIdx: hasCorrectFlag ? q.options.findIndex(o => o.correct) : null,
      correctAnswerText: hasCorrectFlag ? (q.options.find(o => o.correct) || {}).text : null,
      isCorrect: !!(userOption && userOption.correct),
      hasCorrectFlag,
      idealExplanation: q.idealExplanation || '',
      wrongExplanation: q.wrongExplanation || '',
    });
  }

  const familyPcts = {};
  FAMILY_KEYS.forEach(f => {
    familyPcts[f] = max[f] > 0 ? Math.round(totals[f] / max[f] * 100) : 0;
  });

  const softSkills = {};
  SOFT_SKILLS.forEach(k => {
    const v = softTotals[k];
    softSkills[k] = {
      pct: v.m > 0 ? Math.round(v.s / v.m * 100) : 0,
      correct: v.correct,
      total: v.total,
    };
  });

  const sorted = Object.entries(familyPcts).sort((a, b) => b[1] - a[1]);
  const familyKey = sorted[0] ? sorted[0][0] : FAMILY_KEYS[0];

  return {
    familyKey,
    familyPcts,
    softSkills,
    totalCorrect,
    totalGraded,
    feedback,
  };
}

module.exports = {
  QUESTIONS,
  FAMILY_KEYS,
  FAMILY_NAMES,
  SOFT_SKILLS,
  getQuestionsForClient,
  gradeAnswers,
};
