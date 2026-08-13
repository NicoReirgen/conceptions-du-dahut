/*
===================================================================================
SYSTÈME D'IMAGES UNIVERSEL - VERSION SIMPLIFIÉE
===================================================================================

Système agnostique qui fonctionne pour tout véhicule (Orion, Modular, etc.)
- Détection automatique des champs avec traitementImage: true
- URLs basées sur une structure hiérarchique inversée
- Fallback progressif avec mémorisation des images validées
- Clés simplifiées pour correspondre directement aux dossiers d'images

Structure hiérarchique :
/assets/images/orion/orion-base.jpg
/assets/images/orion/mobilier/tiroirs.jpg
/assets/images/orion/finitions/stratifie-bleu_velvet.jpg
/assets/images/orion/finitions/stratifie-bleu_velvet/mobilier/rangement-tiroirs.jpg
/assets/images/orion/parements/sol-bouleau_vernis-clair/mobilier/tiroirs.jpg

Principe : La dernière sélection devient le dossier principal,
les sélections précédentes forment des sous-dossiers imbriqués.
===================================================================================
*/

export const imageSystem = {
    
    // Mode debug
    debugMode: false,
    
    // Historique des images validées (fallbacks progressifs)
    validatedImages: [],
    
    // Derniers fallbacks générés (pour la version synchrone)
    lastGeneratedFallbacks: [],
    
    /**
     * DÉTECTION AUTOMATIQUE DU CHEMIN DE BASE
     */
    getBasePath(vehicleId = 'orion') {
        // Les fichiers sous /public ne doivent pas utiliser le préfixe d'assets buildés (/_nuxt).
        // On s'appuie sur la baseURL Nuxt de l'application pour garder un chemin public correct.
        const runtimeConfig = typeof useRuntimeConfig === 'function'
            ? useRuntimeConfig()
            : null;
        const basePath = runtimeConfig?.app?.baseURL || '/';
        
        // Assure-toi que le basePath se termine par un /
        const normalizedBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
        
        return `${normalizedBasePath}assets/images/${vehicleId}/`;
    },
    
    /**
     * DÉTECTION DES CHAMPS AVEC TRAITEMENT IMAGE
     */
    detectImageFields(vehicleSteps) {
        const imageFields = [];
        
        const processField = (field, stepIndex, subStepIndex) => {
            if (field.type === 'group' && field.fields) {
                field.fields.forEach(subField => {
                    processField(subField, stepIndex, subStepIndex);
                });
                return;
            }
            
            // Seuls les champs avec traitementImage explicitement défini à true sont inclus
            // Les champs avec traitementImage: false ou non défini sont exclus
            if (field.traitementImage === true) {
                imageFields.push({
                    key: field.key,
                    type: field.type,
                    field: field,
                    stepIndex,
                    subStepIndex,
                    order: imageFields.length
                });
            }
        };
        
        vehicleSteps.forEach((step, stepIndex) => {
            if (step.subSteps) {
                step.subSteps.forEach((subStep, subStepIndex) => {
                    if (subStep.fields) {
                        subStep.fields.forEach(field => {
                            processField(field, stepIndex, subStepIndex);
                        });
                    }
                });
            }
        });
        
        this.log(`${imageFields.length} champs image détectés:`, imageFields.map(f => f.key));
        return imageFields;
    },
    
    /**
     * OBTENIR L'IMAGE DE BASE POUR UN VÉHICULE
     */
    getBaseImage(vehicleId) {
        return this.getBasePath(vehicleId) + `${vehicleId}-base.jpg`;
    },
    
    /** Les champs retenus pour l'image, dans l'ordre du formulaire. */
    champsRetenus(selectedOptions, vehicleSteps) {
        if (!selectedOptions || !vehicleSteps) return [];

        return this.extractValidatedFields(selectedOptions, this.detectImageFields(vehicleSteps));
    },

    /**
     * CONSTRUCTION DE L'URL D'IMAGE
     */
    buildImageUrl(selectedOptions, vehicleId, vehicleSteps) {
        return this.cheminPour(this.champsRetenus(selectedOptions, vehicleSteps), vehicleId);
    },

    /*
       Le chemin que désignent des champs retenus.

       Un champ déclaré indépendant ne s'imbrique pas : son image existe seule,
       quelles que soient les autres sélections. Il l'emporte donc sur le reste.
    */
    cheminPour(champs, vehicleId) {
        const independant = champs.find(champ => champ.field?.independant === true);

        if (independant) {
            return this.cheminDepuis([independant], vehicleId);
        }

        const contextuels = champs.filter(champ => champ.field?.independant !== true);

        return contextuels.length > 0
            ? this.cheminDepuis(contextuels, vehicleId)
            : this.getBaseImage(vehicleId);
    },

    /*
       Composition d'un chemin : la dernière sélection donne le dossier
       principal, les précédentes forment les sous-dossiers imbriqués. D'où le
       parcours à l'envers.

       Cette boucle était écrite cinq fois — une par branche de l'URL
       indépendante, de l'URL contextuelle et des replis. Quatre d'entre elles
       distinguaient « un seul champ » de « plusieurs », distinction sans objet :
       renverser une liste d'un élément la laisse telle quelle.
    */
    cheminDepuis(champs, vehicleId) {
        const segments = [this.getBasePath(vehicleId).slice(0, -1)];

        for (const champ of [...champs].reverse()) {
            const dossier = this.getFolderName(champ.key);
            const valeurs = this.getSelectedValues(champ.value, champ.type, champ);

            if (dossier && valeurs) {
                segments.push(dossier, valeurs);
            }
        }

        const chemin = segments.join('/') + '.jpg';
        this.log(`URL générée: ${chemin}`);

        return chemin;
    },
    
    /**
     * EXTRACTION DES CHAMPS VALIDÉS
     */
    extractValidatedFields(selectedOptions, imageFields) {
        const validatedFields = [];
        
        imageFields.forEach(fieldInfo => {
            const value = selectedOptions[fieldInfo.key];
            
            if (this.isFieldValidated(value, fieldInfo.type)) {
                // Vérifier si ce champ a des options qui peuvent impacter les images
                const hasImageEnabledOptions = this.hasImageEnabledOptions(value, fieldInfo);
                
                if (hasImageEnabledOptions) {
                    validatedFields.push({
                        key: fieldInfo.key,
                        type: fieldInfo.type,
                        value: value,
                        order: fieldInfo.order,
                        field: fieldInfo.field // Ajouter la référence complète au champ
                    });
                } else {
                    this.log(`Champ ${fieldInfo.key} ignoré car toutes ses options ont disableImageHandling: true`);
                }
            }
        });
        
        // Trier par ordre d'apparition dans le formulaire
        return validatedFields.sort((a, b) => a.order - b.order);
    },
    
    /**
     * VÉRIFIER SI UN CHAMP EST VALIDÉ
     */
    isFieldValidated(value, fieldType) {
        if (!value) return false;
        
        switch (fieldType) {
            case 'unique':
                return typeof value === 'object' && value.main && value.sub;
            case 'multiple':
                return Array.isArray(value) && value.length > 0;
            case 'deep_multiple':
                return typeof value === 'object' && value.mainOptions && value.mainOptions.length > 0;
            case 'select':
                return typeof value === 'string' && value.length > 0;
            default:
                return !!value;
        }
    },

    /**
     * VÉRIFIER SI UN CHAMP A DES OPTIONS QUI PEUVENT IMPACTER LES IMAGES
     */
    hasImageEnabledOptions(value, fieldInfo) {
        if (!fieldInfo || !fieldInfo.field) {
            return true; // Si pas d'info sur le champ, considérer comme activé
        }
        
        switch (fieldInfo.type) {
            case 'unique':
                if (typeof value === 'object' && value.main) {
                    return this.isOptionImageEnabled(value.main, fieldInfo);
                }
                return true;
                
            case 'multiple':
                if (Array.isArray(value)) {
                    const filteredValues = this.filterImageEnabledOptions(value, fieldInfo);
                    return filteredValues.length > 0;
                }
                return true;
                
            case 'deep_multiple':
                if (typeof value === 'object' && value.mainOptions && Array.isArray(value.mainOptions)) {
                    // Vérifier s'il y a au moins une option principale activée pour les images
                    const hasEnabledMainOptions = value.mainOptions.some(mainKey => {
                        const mainOption = fieldInfo.field.options?.find(opt => opt.key === mainKey);
                        return mainOption && mainOption.disableImageHandling !== true;
                    });
                    
                    return hasEnabledMainOptions;
                }
                return true;
                
            case 'select':
                // Pour les champs select, pas d'options complexes à vérifier
                return true;
                
            default:
                return true;
        }
    },

    /**
     * EXTRAIRE LES OPTIONS LES PLUS PROFONDES POUR deep_multiple
     * Pour un champ deep_multiple, seules les sous-options les plus profondes influencent l'URL
     * Avec les nouvelles clés simplifiées, c'est beaucoup plus direct
     */
    extractDeepestOptions(value, fieldInfo) {
        if (fieldInfo.type !== 'deep_multiple' || !value.mainOptions) {
            this.log(`extractDeepestOptions: type=${fieldInfo.type}, mainOptions=${!!value.mainOptions}`);
            return null;
        }

        this.log(`extractDeepestOptions: Analysing ${value.mainOptions.length} main options:`, value.mainOptions);
        const deepestSelections = [];

        // Pour chaque option principale sélectionnée
        value.mainOptions.forEach(mainOptionKey => {
            const mainOption = fieldInfo.field.options?.find(opt => opt.key === mainOptionKey);
            
            // Vérifier si cette option principale est désactivée pour les images
            if (mainOption && mainOption.disableImageHandling === true) {
                this.log(`Option principale ${mainOptionKey} ignorée pour les images (disableImageHandling: true)`);
                return;
            }
            
            if (!mainOption?.deepOptions) {
                // Cette option principale n'a pas de sous-options
                // Dans le contexte d'un deep_multiple, cela signifie qu'elle n'est pas complètement configurée
                // Ne pas l'inclure dans l'URL car elle n'est pas une vraie feuille
                return;
            }

            // Explorer les sous-options pour trouver les vraies feuilles
            const deepestForThisMain = this.findDeepestInBranch(
                mainOption.deepOptions,
                value,
                mainOptionKey
            );
            
            // Ne garder que si on a trouvé des feuilles réelles
            if (deepestForThisMain.length > 0) {
                deepestSelections.push(...deepestForThisMain);
            }
            // Si pas de feuilles trouvées, ne pas inclure l'option intermédiaire
        });

        this.log(`extractDeepestOptions: Résultat final:`, deepestSelections);
        return deepestSelections.length > 0 ? deepestSelections : null;
    },

    /*
       Feuilles de sélection d'une option principale.

       C'était une fonction de 72 lignes à six niveaux d'imbrication, où trois
       règles indépendantes — coloris, case à cocher, choix unique — se
       partageaient une pile de `if` imbriqués. Chacune est désormais nommée à
       côté, et celle-ci ne fait plus qu'aiguiller.

       Le comportement est inchangé : 16 cas de test l'attestent, écrits avant
       le découpage.
    */
    findDeepestInBranch(deepOptions, selectedValues, mainKey) {
        const feuilles = [];

        for (const optionProfonde of deepOptions) {
            if (optionProfonde.disableImageHandling === true) {
                this.log(`Deep option ${optionProfonde.key} de ${mainKey} ignorée pour les images (disableImageHandling: true)`);
                continue;
            }

            const cheminProfond = `${mainKey}.${optionProfonde.key}`;
            const retenu = selectedValues.deepOptions?.[cheminProfond];

            if (optionProfonde.type === 'color_selection') {
                const chemin = this.feuilleColoris(optionProfonde, retenu, mainKey);
                if (chemin) feuilles.push(chemin);

            } else if (optionProfonde.type === 'checkbox') {
                const chemin = this.feuilleCase(optionProfonde, retenu, mainKey);
                if (chemin) feuilles.push(chemin);

            } else if (optionProfonde.type === 'unique') {
                feuilles.push(
                    ...this.feuillesChoixUnique(optionProfonde, retenu, mainKey, cheminProfond, selectedValues)
                );
            }
        }

        return feuilles;
    },

    /** Un coloris est toujours terminal : il ferme le chemin. */
    feuilleColoris(optionProfonde, retenu, mainKey) {
        if (!retenu) return null;

        const coloris = optionProfonde.options?.find(opt => opt.key === retenu);
        if (coloris?.disableImageHandling === true) {
            this.log(`Couleur ${retenu} de ${mainKey}.${optionProfonde.key} ignorée pour les images (disableImageHandling: true)`);
            return null;
        }

        return `${mainKey}-${retenu}`;
    },

    /*
       Une case cochée se reconnaît à ce qu'elle porte sa propre clé pour
       valeur — ou un booléen, selon le composant qui l'a écrite.
    */
    feuilleCase(optionProfonde, retenu, mainKey) {
        const cochee = retenu === optionProfonde.key || retenu === true;
        return cochee ? `${mainKey}-${optionProfonde.key}` : null;
    },

    /*
       Un choix unique peut être terminal, ou ouvrir un niveau de plus. S'il en
       ouvre un et qu'aucune feuille n'y est retenue, rien n'est produit : un
       chemin partiel ne désignerait aucune image.
    */
    feuillesChoixUnique(optionProfonde, retenu, mainKey, cheminProfond, selectedValues) {
        if (!retenu) return [];

        const choisie = optionProfonde.options?.find(opt => opt.key === retenu);

        if (choisie?.disableImageHandling === true) {
            this.log(`Option unique ${retenu} de ${mainKey}.${optionProfonde.key} ignorée pour les images (disableImageHandling: true)`);
            return [];
        }

        if (!choisie?.deepOptions) {
            return [`${mainKey}-${retenu}`];
        }

        return this
            .findDeepestInSubBranch(choisie.deepOptions, selectedValues.subDeepOptions || {}, `${cheminProfond}.${retenu}`)
            .map(feuille => `${mainKey}-${retenu}-${feuille}`);
    },

    /*
       Dernier niveau de profondeur. Il ne traite que les coloris — les seuls
       qui descendent aussi bas dans le catalogue — et rend la valeur brute :
       c'est l'appelant qui compose le chemin complet.
    */
    findDeepestInSubBranch(deepOptions, subDeepOptions, cheminCourant) {
        const feuilles = [];

        for (const optionProfonde of deepOptions) {
            if (optionProfonde.disableImageHandling === true) {
                this.log(`Sub deep option ${optionProfonde.key} ignorée pour les images (disableImageHandling: true)`);
                continue;
            }

            if (optionProfonde.type !== 'color_selection') continue;

            const retenu = subDeepOptions[`${cheminCourant}.${optionProfonde.key}`];
            if (!retenu) continue;

            const coloris = optionProfonde.options?.find(opt => opt.key === retenu);
            if (coloris?.disableImageHandling === true) {
                this.log(`Sub couleur ${retenu} ignorée pour les images (disableImageHandling: true)`);
                continue;
            }

            feuilles.push(retenu);
        }

        return feuilles;
    },
    
    /**
     * OBTENIR LE NOM DU DOSSIER À PARTIR DE LA CLÉ
     * AVEC LES NOUVELLES CLÉS SIMPLIFIÉES, C'EST DIRECT
     */
    getFolderName(key) {
        // Les clés correspondent maintenant directement aux noms de dossiers
        // Ex: "mobilier" → "mobilier"
        // Ex: "finitions" → "finitions" 
        // Ex: "equipements" → "equipements"
        // Ex: "parements" → "parements"
        return key;
    },

    /*
       Table d'aiguillage des types de champ. Déclarée sur l'objet pour que les
       méthodes restent appelées avec le bon `this` — elles s'appuient toutes
       sur `normalizeValue` et sur le journal.

       `select` n'y figure pas : il tombe dans le traitement par défaut, qui est
       exactement le sien.
    */
    VALEURS_PAR_TYPE: {
        unique(value, fieldInfo) { return this.valeursUnique(value, fieldInfo); },
        multiple(value, fieldInfo) { return this.valeursMultiple(value, fieldInfo); },
        deep_multiple(value, fieldInfo) { return this.valeursDeepMultiple(value, fieldInfo); },
    },

    /*
       Traduit une sélection en segment de chemin d'image.

       C'était un `switch` de 59 lignes, complexité 17. Chaque type a désormais
       sa méthode, et celle-ci n'est plus qu'un aiguillage.

       18 cas de test décrivent le comportement, écrits avant le découpage.
    */
    getSelectedValues(value, fieldType, fieldInfo = null) {
        const traduire = this.VALEURS_PAR_TYPE[fieldType];

        // Un type sans traitement particulier se contente d'être normalisé.
        return traduire ? traduire.call(this, value, fieldInfo) : this.normalizeValue(value);
    },

    /*
       Choix unique : la principale, éventuellement suivie de sa sous-option.
       Chacune peut être écartée des images indépendamment.
    */
    valeursUnique(value, fieldInfo) {
        if (!value?.main) return null;

        if (!this.isOptionImageEnabled(value.main, fieldInfo)) return null;

        const principale = this.normalizeValue(value.main);

        if (!value.sub) return principale;

        // Sous-option écartée : on garde la principale seule plutôt que rien.
        if (!this.isSubOptionImageEnabled(value.main, value.sub, fieldInfo)) return principale;

        return `${principale}-${this.normalizeValue(value.sub)}`;
    },

    /*
       Choix multiple. Le tri est essentiel : il rend le nom de fichier
       indépendant de l'ordre dans lequel le visiteur a coché.
    */
    valeursMultiple(value, fieldInfo) {
        if (!Array.isArray(value)) return null;

        const retenues = this.filterImageEnabledOptions(value, fieldInfo);
        if (retenues.length === 0) return null;

        return retenues.map(v => this.normalizeValue(v)).sort().join('-');
    },

    /*
       Choix multiple profond : seules les feuilles comptent. Sans description
       du champ, on préfère ne produire aucune URL plutôt qu'une fausse.
    */
    valeursDeepMultiple(value, fieldInfo) {
        if (!fieldInfo) {
            this.log(`Pas d'info sur le champ deep_multiple, pas d'URL générée`);
            return null;
        }

        const feuilles = this.extractDeepestOptions(value, fieldInfo);

        if (!feuilles || feuilles.length === 0) {
            this.log(`Aucune option feuille trouvée pour ${fieldInfo.key}, pas d'URL générée`);
            return null;
        }

        this.log(`Options feuilles trouvées pour ${fieldInfo.key}:`, feuilles);

        return feuilles.map(v => this.normalizeValue(v)).sort().join('-');
    },

    
    /**
     * FILTRER LES OPTIONS ACTIVÉES POUR LES IMAGES
     * Supprime les options qui ont disableImageHandling: true ou isDefault: true
     */
    filterImageEnabledOptions(selectedValues, fieldInfo) {
        if (!fieldInfo || !fieldInfo.field || !fieldInfo.field.options) {
            return selectedValues; // Si pas d'info sur les options, garder toutes les valeurs
        }
        
        // Filtrer d'abord les options avec disableImageHandling: true
        const nonDisabledOptions = selectedValues.filter(optionKey => {
            const option = fieldInfo.field.options.find(opt => opt.key === optionKey);
            if (!option) return true; // Si option non trouvée, la garder par sécurité
            
            if (option.disableImageHandling === true) {
                this.log(`Option ${optionKey} ignorée pour les images (disableImageHandling: true)`);
                return false;
            }
            return true;
        });
        
        // Ensuite, gérer les options par défaut
        const nonDefaultOptions = nonDisabledOptions.filter(optionKey => {
            const option = fieldInfo.field.options.find(opt => opt.key === optionKey);
            return option && option.isDefault !== true;
        });
        
        // Si on a des options non-par-défaut, utiliser celles-ci
        // Sinon, utiliser toutes les options non-désactivées (y compris l'option par défaut)
        if (nonDefaultOptions.length > 0) {
            return nonDefaultOptions;
        } else {
            this.log(`Aucune option non-par-défaut trouvée, inclusion de l'option par défaut pour maintenir la cohérence`);
            return nonDisabledOptions;
        }
    },
    
    /**
     * NORMALISER UNE VALEUR  
     * AVEC LES NOUVELLES CLÉS SIMPLIFIÉES, LA NORMALISATION EST BEAUCOUP PLUS SIMPLE
     */
    normalizeValue(value) {
        if (!value) return '';
        
        // Les clés sont maintenant simples et cohérentes, juste normaliser les espaces
        return value.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    },
    
    /**
     * ENREGISTRER UNE IMAGE VALIDÉE
     */
    saveValidatedImage(imageUrl, stepIndex) {
        // Ajouter à l'historique des images validées
        this.validatedImages.push({
            url: imageUrl,
            stepIndex: stepIndex,
            timestamp: Date.now()
        });
        
        // Garder seulement les 10 dernières images
        if (this.validatedImages.length > 10) {
            this.validatedImages = this.validatedImages.slice(-10);
        }
        
        this.log(`Image validée sauvegardée: ${imageUrl} (étape ${stepIndex})`);
    },
    
    /*
       Les replis, du plus proche de la configuration au plus général : on
       retire les sélections une à une, de la plus récente à la première, et
       l'image du véhicule ferme la liste.

       Les doublons sont écartés — la liste se terminait par deux fois l'image
       de base, que le navigateur redemandait alors deux fois.
    */
    generateFallbackUrls(validatedFields, vehicleId) {
        const replis = [];

        for (let i = validatedFields.length - 1; i >= 0; i--) {
            const restants = validatedFields.slice(0, i);

            replis.push(restants.length > 0
                ? this.cheminDepuis(restants, vehicleId)
                : this.getBaseImage(vehicleId));
        }

        replis.push(this.getBaseImage(vehicleId));

        return [...new Set(replis)];
    },
    
    /*
       Le repli suivant, parmi ceux qui n'ont pas encore échoué.

       Le composant se souvient de ce qu'il a essayé : sans cette mémoire, il
       repartait sur le premier de la liste dès qu'il n'était plus l'image
       courante, et deux replis en échec se renvoyaient la balle sans fin.
    */
    repliSuivant(deja = []) {
        return this.getLastFallbacks().find((url) => !deja.includes(url)) || null;
    },

    /**
     * URL D'APERÇU, AVEC SES REPLIS PRÉPARÉS
     *
     * Il n'y a plus de version asynchrone. Elle chargeait l'image entière pour
     * savoir si elle existait — 41 Ko de JPEG par changement d'option, jamais
     * affichés, avant les 26 Ko d'AVIF réellement montrés. C'est l'échec de
     * chargement qui déclenche désormais le repli, et il ne coûte rien quand le
     * fichier est là.
     */
    getVehicleImageSync(selectedOptions, vehicleId, vehicleSteps, currentStepIndex = 0) {
        // Une seule détection des champs, d'où sortent l'URL et ses replis : le
        // parcours du catalogue était refait deux fois à chaque changement d'option.
        const retenus = this.champsRetenus(selectedOptions, vehicleSteps);

        const targetUrl = this.cheminPour(retenus, vehicleId);

        // Les replis servent au composant si l'image principale ne charge pas.
        const fallbackUrls = this.generateFallbackUrls(retenus, vehicleId);

        // Sauvegarder l'URL et ses fallbacks pour référence future
        this.saveValidatedImage(targetUrl, currentStepIndex);
        this.lastGeneratedFallbacks = fallbackUrls;
        
        this.log(`URL synchrone générée: ${targetUrl}, fallbacks préparés: ${fallbackUrls.slice(0, 2).join(', ')}...`);
        
        return targetUrl;
    },

    /**
     * OBTENIR LES FALLBACKS DE LA DERNIÈRE GÉNÉRATION
     */
    getLastFallbacks() {
        return this.lastGeneratedFallbacks || [];
    },
    
    /**
     * NETTOYER L'HISTORIQUE
     */
    clearHistory() {
        this.validatedImages = [];
        this.log('Historique des images nettoyé');
    },
    
    /**
     * LOG SIMPLE
     */
    log(message, type = 'info') {
        if (!this.debugMode) return;
        
        const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '🎯';
        console.log(`${emoji} [ImageSystem] ${message}`);
    },
    
    /**
     * DEBUG - Afficher l'état actuel
     */
    debugState(selectedOptions, vehicleId, vehicleSteps) {
        if (!this.debugMode) return;
        
        const imageFields = this.detectImageFields(vehicleSteps);
        const validatedFields = this.extractValidatedFields(selectedOptions, imageFields);
        const generatedUrl = this.buildImageUrl(selectedOptions, vehicleId, vehicleSteps);
        
        console.group('🚐 DEBUG IMAGE SYSTEM');
        console.log('🎯 Véhicule:', vehicleId);
        console.log('🔍 Champs image détectés:', imageFields.map(f => `${f.key} (${f.type})`));
        console.log('📦 Champs validés:', validatedFields.map(f => `${f.key}: ${JSON.stringify(f.value)}`));
        console.log('🖼️ URL complète générée:', generatedUrl);
        console.log('📚 Historique fallbacks:', this.validatedImages.map(img => img.url));
        console.groupEnd();
    },

    /**
     * VÉRIFIER SI UNE OPTION PRINCIPALE EST ACTIVÉE POUR LES IMAGES
     */
    isOptionImageEnabled(optionKey, fieldInfo) {
        if (!fieldInfo || !fieldInfo.field || !fieldInfo.field.options) {
            return true; // Si pas d'info sur les options, considérer comme activé
        }
        
        const option = fieldInfo.field.options.find(opt => opt.key === optionKey);
        if (!option) return true; // Si option non trouvée, la garder par sécurité
        
        // Retourner false seulement si disableImageHandling est explicitement true
        const isImageEnabled = option.disableImageHandling !== true;
        
        if (!isImageEnabled) {
            this.log(`Option principale ${optionKey} ignorée pour les images (disableImageHandling: true)`);
        }
        
        return isImageEnabled;
    },
    
    /**
     * VÉRIFIER SI UNE SOUS-OPTION EST ACTIVÉE POUR LES IMAGES
     */
    isSubOptionImageEnabled(mainOptionKey, subOptionKey, fieldInfo) {
        if (!fieldInfo || !fieldInfo.field || !fieldInfo.field.options) {
            return true; // Si pas d'info sur les options, considérer comme activé
        }
        
        const mainOption = fieldInfo.field.options.find(opt => opt.key === mainOptionKey);
        if (!mainOption || !mainOption.subOptions) return true;
        
        const subOption = mainOption.subOptions.find(opt => opt.key === subOptionKey);
        if (!subOption) return true; // Si sous-option non trouvée, la garder par sécurité
        
        // Retourner false seulement si disableImageHandling est explicitement true
        const isImageEnabled = subOption.disableImageHandling !== true;
        
        if (!isImageEnabled) {
            this.log(`Sous-option ${subOptionKey} de ${mainOptionKey} ignorée pour les images (disableImageHandling: true)`);
        }
        
        return isImageEnabled;
    }

};

// EXPORT POUR COMPATIBILITÉ
export const useVehicleImages = () => {
    return {
        getVehicleImageSync: imageSystem.getVehicleImageSync.bind(imageSystem),
        getLastFallbacks: imageSystem.getLastFallbacks.bind(imageSystem),
        repliSuivant: imageSystem.repliSuivant.bind(imageSystem),
        saveValidatedImage: imageSystem.saveValidatedImage.bind(imageSystem),
        clearHistory: imageSystem.clearHistory.bind(imageSystem),
        debugState: imageSystem.debugState.bind(imageSystem)
    };
};
