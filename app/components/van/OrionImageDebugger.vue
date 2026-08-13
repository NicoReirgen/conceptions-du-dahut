<template>
    <div v-if="showDebugger" class="orion-debugger">
        <div class="debugger-header" @click="toggleDebugger">
            <h4>Orion Image Debugger</h4>
            <div class="header-buttons">
                <button @click.stop="toggleDebugger" class="toggle-btn" :title="expanded ? 'Réduire' : 'Agrandir'">
                    <span v-if="expanded">−</span>
                    <span v-else>+</span>
                </button>
                <button @click.stop="toggleVisibility" class="close-btn" title="Fermer le debugger">
                    ×
                </button>
            </div>
        </div>
        
        <!-- Nom du fichier toujours visible -->
        <div class="image-name-persistent">
            <span class="filename-label">Image</span>
            <code class="filename-compact">{{ currentImageName }}</code>
        </div>
        
        <div v-if="expanded" class="debugger-content">
            <div class="current-selection">
                <h5>Configuration actuelle</h5>
                <div v-if="hasConfiguration" class="config-list">
                    <div class="config-item" v-for="(value, key) in parsedConfig" :key="key">
                        <span class="config-key">{{ key }}</span>
                        <span class="config-value">{{ formatConfigValue(value) }}</span>
                    </div>
                </div>
                <div v-else class="no-config">
                    <em>Configuration de base (aucune option sélectionnée)</em>
                </div>
            </div>
            
            <div class="fallback-info" v-if="fallbackChain.length > 1">
                <h5>Chaîne de fallback</h5>
                <div class="fallback-item" v-for="(fallback, index) in fallbackChain" :key="index">
                    <span class="fallback-priority">{{ index + 1 }}</span>
                    <code :class="{ 'primary-image': index === 0, 'fallback-image': index > 0 }">{{ fallback }}</code>
                    <span v-if="index === 0" class="priority-label">(demandée)</span>
                    <span v-else-if="index === fallbackChain.length - 1" class="priority-label">(finale)</span>
                </div>
                <div class="sync-info">
                    <small>Chaîne synchronisée avec le système principal</small>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useVehicleImages } from '~~/app/composables/useVehicleImages';

const props = defineProps({
    selectedOptions: {
        type: Object,
        default: () => ({})
    },
    selectedVehicle: {
        type: Object,
        default: null
    },
    vehicleSteps: {
        type: Array,
        default: () => []
    }
});

// Utiliser le nouveau système d'images universel
const { getVehicleImageSync, getLastFallbacks } = useVehicleImages();

// Ne montrer le debugger qu'en mode développement
const showDebugger = ref(import.meta.env.DEV);
const expanded = ref(false); // Debugger plié par défaut

const toggleDebugger = () => {
    expanded.value = !expanded.value;
};

const toggleVisibility = () => {
    showDebugger.value = !showDebugger.value;
};

// Exposer la fonction pour la masquer depuis l'extérieur
defineExpose({
    toggleVisibility
});

// Fonction pour formater l'affichage des valeurs de configuration
const formatConfigValue = (value) => {
    if (!value) return 'base';
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    return String(value);
};

/*
   L'état courant, tel que le panneau le présente.

   Ce calcul appelait `debugState`, dont l'unique effet était d'écrire dans la
   console — un effet de bord dans un `computed`, réexécuté à chaque rendu. Le
   panneau affiche déjà tout ce que cette trace répétait.
*/
const systemDebugInfo = computed(() => {
    if (!props.selectedVehicle) {
        return null;
    }

    const vehicleId = props.selectedVehicle.id || 'orion';

    return {
        vehicleId,
        selectedOptions: props.selectedOptions,
        vehicleSteps: props.vehicleSteps
    };
});

// Configuration parsée depuis le système principal
const parsedConfig = computed(() => {
    if (!systemDebugInfo.value) return {};
    
    const config = {};
    const vehicleId = systemDebugInfo.value.vehicleId;
    
    // Générer l'URL d'image pour voir la structure
    const imageUrl = getVehicleImageSync(props.selectedOptions, vehicleId, props.vehicleSteps);
    
    // Extraire les segments du chemin pour affichage
    const basePath = `/${vehicleId}/`;
    const relativePath = imageUrl.replace(basePath, '').replace('.jpg', '');
    const segments = relativePath.split('/').filter(Boolean);
    
    // Créer une structure lisible
    for (let i = 0; i < segments.length; i += 2) {
        if (segments[i] && segments[i + 1]) {
            config[segments[i]] = segments[i + 1];
        }
    }
    
    return config;
});

// Vérifier si il y a une configuration active
const hasConfiguration = computed(() => {
    return Object.keys(parsedConfig.value).length > 0;
});

// URL complète de l'image depuis le nouveau système
const currentImageName = computed(() => {
    if (!props.selectedVehicle) {
        return '/orion/orion-base.jpg';
    }
    
    const vehicleId = props.selectedVehicle.id || 'orion';
    const imageUrl = getVehicleImageSync(props.selectedOptions, vehicleId, props.vehicleSteps);
    
    // Retourner l'URL complète pour le débogage
    return imageUrl;
});

/*
   La chaîne de repli réellement préparée par le système.

   Ce calcul ne rendait que l'image courante, dans un tableau d'un élément —
   et le gabarit n'affiche la section qu'à partir de deux. Elle ne s'est donc
   jamais montrée. C'est pourtant l'information utile maintenant que l'aperçu
   se rabat sur cette liste quand un fichier manque.
*/
const fallbackChain = computed(() => {
    if (!props.selectedVehicle) return [];

    return [currentImageName.value, ...getLastFallbacks().filter((url) => url !== currentImageName.value)];
});
</script>

<style scoped>
.orion-debugger {
    position: fixed;
    bottom: 1.25rem;
    left: 1.25rem;
    background: rgba(15, 15, 15, 0.95);
    backdrop-filter: blur(.625rem);
    color: #ffffff;
    border: .0313rem solid rgba(255, 255, 255, 0.1);
    border-radius: .75rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: .8125rem ;
    max-width: 23.75rem;
    min-width: 17.5rem;
    z-index: 9999;
    box-shadow: 
        0 .5rem 2rem rgba(0, 0, 0, 0.3),
        0 .0625rem 0 rgba(255, 255, 255, 0.1) inset;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.debugger-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem .75rem 1.25rem;
    cursor: pointer;
    border-radius: .75rem .75rem 0 0;
    transition: background-color 0.2s ease;
    border-bottom: .0625rem solid rgba(255, 255, 255, 0.05);
}

.debugger-header:hover {
    background: rgba(255, 255, 255, 0.03);
}

.debugger-header h4 {
    margin: 0;
    font-size: 1rem ;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: -0.0125rem;
}

.header-buttons {
    display: flex;
    gap: .5rem;
    align-items: center;
}

.toggle-btn,
.close-btn {
    background: rgba(255, 255, 255, 0.08);
    border: .0625rem solid rgba(255, 255, 255, 0.12);
    color: #ffffff;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: .375rem;
    cursor: pointer;
    font-size: .875rem ;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.toggle-btn:hover,
.close-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-0.0625rem);
}

.close-btn {
    color: #ff6b6b;
    border-color: rgba(255, 107, 107, 0.3);
}

.close-btn:hover {
    background: rgba(255, 107, 107, 0.15);
    border-color: rgba(255, 107, 107, .5);
}

/* Section nom de fichier persistante */
.image-name-persistent {
    display: flex;
    align-items: center;
    gap: .75rem;
    margin: 0 1.25rem 1rem 1.25rem;
    padding: .75rem 1rem;
    background: rgba(34, 197, 94, 0.08);
    border: .0625rem solid rgba(34, 197, 94, 0.2);
    border-radius: .5rem;
}

.filename-label {
    font-size: .75rem ;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: .0313rem;
    flex-shrink: 0;
}

.filename-compact {
    background: rgba(0, 0, 0, 0.3);
    color: #22c55e;
    padding: .375rem .625rem;
    border-radius: .375rem;
    font-size: .75rem ;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-weight: 500;
    word-break: break-all;
    flex: 1;
    min-width: 0;
    border: .0625rem solid rgba(34, 197, 94, 0.2);
}

.debugger-content {
    padding: 0 1.25rem 1.25rem 1.25rem;
    max-height: 60vh;
    overflow-y: auto;
}

.current-selection h5,
.fallback-info h5 {
    margin: 0 0 .75rem 0;
    font-size: .8125rem ;
    font-weight: 600;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: .0313rem;
}

.config-list {
    max-height: 12.5rem;
    overflow-y: auto;
    border-radius: .5rem;
    border: .0625rem solid rgba(255, 255, 255, 0.1);
}

.config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .5rem .75rem;
    border-bottom: .0625rem solid rgba(255, 255, 255, 0.05);
    transition: background-color 0.2s ease;
}

.config-item:last-child {
    border-bottom: none;
}

.config-item:hover {
    background: rgba(255, 255, 255, 0.03);
}

.config-key {
    color: #60a5fa;
    font-weight: 500;
    font-size: .75rem ;
}

.config-value {
    color: #fbbf24;
    text-align: right;
    max-width: 11.25rem;
    word-break: break-word;
    font-size: .75rem ;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.no-config {
    color: rgba(255, 255, 255, .5);
    font-style: italic;
    padding: 1.25rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
    border: .0625rem dashed rgba(255, 255, 255, 0.1);
    border-radius: .5rem;
    font-size: .75rem ;
}

.fallback-info {
    margin-top: 1.5rem;
}

.fallback-item {
    display: flex;
    gap: .75rem;
    margin-bottom: .5rem;
    align-items: center;
    padding: .5rem .75rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: .375rem;
    border: .0625rem solid rgba(255, 255, 255, 0.05);
}

.fallback-priority {
    color: #f87171;
    min-width: 1.25rem;
    font-weight: 600;
    font-size: .6875rem ;
}

.fallback-item code {
    background: rgba(0, 0, 0, 0.3);
    padding: .25rem .5rem;
    border-radius: .25rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: .6875rem ;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    flex: 1;
    word-break: break-all;
    border: .0313rem solid rgba(255, 255, 255, 0.1);
}

.fallback-item code.primary-image {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    font-weight: 600;
    border-color: rgba(34, 197, 94, 0.3);
}

.fallback-item code.fallback-image {
    background: rgba(251, 191, 36, 0.1);
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.2);
}

.priority-label {
    font-size: .625rem ;
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
    font-weight: 400;
}

.sync-info {
    margin-top: .75rem;
    padding: .5rem .75rem;
    background: rgba(34, 197, 94, 0.08);
    border: .0313rem solid rgba(34, 197, 94, 0.2);
    border-radius: .375rem;
    text-align: center;
}

.sync-info small {
    color: #22c55e;
    font-size: .6875rem ;
    font-weight: 500;
}

/* Scrollbar styling */
.debugger-content::-webkit-scrollbar,
.config-list::-webkit-scrollbar {
    width: .25rem;
}

.debugger-content::-webkit-scrollbar-track,
.config-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: .125rem;
}

.debugger-content::-webkit-scrollbar-thumb,
.config-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: .125rem;
}

.debugger-content::-webkit-scrollbar-thumb:hover,
.config-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}
</style>
