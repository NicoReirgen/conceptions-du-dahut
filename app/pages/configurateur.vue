<template>
	<div class="mobile-landscape-overlay">
		<div class="landscape-message">
			<div class="rotate-icon">📱</div>
			<h3>Mode portrait recommandé</h3>
			<p>Pour une meilleure expérience, veuillez tourner votre appareil en mode portrait</p>
		</div>
	</div>
    
	<VanConfigurator />
</template>

<script setup>
    definePageMeta({
        layout: 'configurateur'
    })

    /*
       Cette page n'a pas d'équivalent dans WordPress : le configurateur est une
       application Nuxt, `useContentSeo` n'a donc rien à poser ici. Le titre et
       la description sont écrits en dur, faute de quoi la page part en ligne
       sans description — le seul audit SEO qui échouait encore.
    */
    useHead({
        title: 'Configurateur — Les Conceptions du Dahut',
        meta: [
            {
                name: 'description',
                content:
                    'Composez votre aménagement Orion en ligne : véhicule, mobilier, ' +
                    'finitions, ouvrants, isolation et équipements extérieurs, avec le ' +
                    'prix qui se met à jour à chaque choix.',
            },
        ],
    })
</script>

<style>
/*
   Ce bloc n'est pas `scoped` : il stylait `html`, `p`, `h2`, `h3`, `a`, `img`…
   au niveau global. Or Nuxt préfetche le chunk du configurateur depuis
   n'importe quelle page, et ces règles — hors de toute couche CSS, donc
   prioritaires sur le `@layer base` de Tailwind — écrasaient alors la
   typographie du site entier.

   Mesuré : sur qui-sommes-nous, `p { font-size: 1rem }` faisait passer le
   paragraphe d'introduction de 31 px à 12 px environ deux secondes après le
   chargement, soit un décalage de mise en page de 0,27.

   Tout est désormais confiné au layout du configurateur. Le rendu de la page
   configurateur est inchangé.
*/
	html:has(.configurateur-layout) {
		font-size: 12px;

		@media  (width > 480px) and (height > 480px) {
			font-size: 14px; 
		}

		@media  (width > 768px) and (height > 768px) {
			font-size: 16px;
		}
	}

.configurateur-layout {



		img {
			vertical-align: middle;

			/*
			   Le site arrondit toutes ses images de 10 px — c'est un parti pris
			   éditorial, pour des visuels posés dans du texte. Le configurateur
			   n'a que des images de pleine surface : l'aperçu du véhicule, qui
			   occupe toute la fenêtre, et les deux visuels de l'étape 2, qui
			   débordent volontairement du padding du panneau. L'arrondi y
			   dessinait des coins parasites.

			   La règle du site vit dans `@layer base` ; celle-ci, hors couche,
			   l'emporte sans avoir à surenchérir sur la spécificité.
			*/
			border-radius: 0;

			/*
			   Héritée du socle du site jusqu'ici. Déclarée sur place, le module
			   ne dépend plus que de la police pour son apparence.
			*/
			max-width: 100%;
		}


		/* Typographie */
		h2 {
			font-size: 1.3125rem;
			font-weight: 500;
			line-height: 1;
		}

		h3 {
			font-size: 1rem;
			font-weight: 400;
			line-height: 1;
		}

		h4 {
			font-size: .625rem;
			font-weight: 500;
			line-height: 1;
			text-transform: uppercase;
		}

		p {
			margin-bottom: 1rem;

			font-size: 1rem;
			font-weight: 400;
		}

		a {
			color: #000;
			text-decoration: none;
		}

		.unique-selection-section {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}

		.unique-options {
			display: flex;
			flex-direction: column;
			gap: 1rem;

			padding-left: 1rem;
			margin-left: .625rem;

			position: relative;

			.unique-option-section, .unique-option-card {
				display: flex;
				flex-direction: column;
				gap: 1rem;

				position: relative;

				.sub-deep-options {
					padding-left:  1rem;
					margin-left: .625rem;
				}
			}
		}

		.deep-option-section {
			display: flex;
			flex-direction: column;
			gap: 1rem;

			.deep-options-container:not(:has(.unique-selection-section)) {
				display: flex;
				flex-direction: column;
				gap: 1rem;

				padding-left: 1rem;
				margin-left: .625rem;

				position: relative;

				.deep-option-wrapper {
					position: relative;
				}
			}
		}

		/* Styles des cartes d'options */
		.options-grid {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}

		/*
		   Les champs à choix multiple, seuls à masquer des options et à en
		   déclarer d'incompatibles.

		   Ces règles vivaient dans le `<style scoped>` de `MultipleField`. La
		   carte étant devenue un composant, elles ne portaient plus que sur sa
		   racine : l'avertissement, la coche et le prix leur échappaient. Elles
		   rejoignent les autres styles de carte, restreintes à la grille qui
		   les concerne — sans quoi l'apparition en fondu gagnerait toutes les
		   cartes du configurateur.
		*/
		.options-exclusives {
			.option-card.hidden-option {
				transition: opacity .3s ease, transform .3s ease;
			}

			.option-card:not(.hidden-option) {
				animation: fadeIn .3s ease;
			}

			.option-card.incompatible {
				opacity: .6;

				&:hover {
					opacity: 1;
				}

				.checkbox {
					opacity: .5;
				}

				h3 {
					color: #666;
				}

				.price {
					color: #999;
				}
			}

			/*
			   `!important` parce que la règle des paragraphes de la carte est
			   plus spécifique que celle-ci, et impose sa couleur grise. Elle
			   impose aussi sa taille et son interligne : les valeurs déclarées
			   ici ne passent pas, et ne passaient déjà pas.
			*/
			.incompatible-warning {
				color: #ff6b6b !important;
				font-style: italic;
			}
		}

		.option-card, .checkbox-option-card, .unique-option-card {
			&:not(:has(.checkbox)).selected {
				.option-card-content {
					background-color: #000;

					.option-info {
						.option-texts {
							h3 {
								color: #fff;
							}

							p.description {
								color: #fff;
							}
						}

						p.price {
							color: #fff;
						}
					}
				}
			}

			.option-card-content {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: .625rem;

				padding: .625rem;

				border-radius: .25rem;
				border: .5px solid #000;

				cursor: pointer;

				.option-info {
					display: flex;
					align-items: flex-end;
					flex-wrap: wrap;
					gap: 0 .625rem;

					flex: 1;

					.option-texts {
						p {
							margin: 0;

							/* Sur fond blanc, #B1B1B1 ne donnait que 2,14:1. */
							color: #595959;
							font-size: .625rem;
							font-weight: 400;
							line-height: 1;
						}
					}

					p.price {
						margin: 0;

						/* #898989 sur blanc : 3,1:1, insuffisant à 10 px. */
						color: #595959;
						font-size: .625rem;
						line-height: 1;
					}
				}

				.checkbox {
					display: flex;
					align-items: center;
					justify-content: center;

					width: 1.125rem;
					height: 1.125rem;

					border: .5px solid #000;
					border-radius: 1.125rem;

					&.checked {
						background: #000;
						border-color: #000;

						.checkmark {
							display: flex;
							align-items: center;
							justify-content: center;
						}
					}

					.checkmark {
						display: none;
						width: .4375rem;
						height: .375rem;

						svg {
							width: 100%;
							height: 100%;
						}
					}
				}
			}
		}

		/* Styles des sous-options */
		.subOptions_wrap {
			h3 {
				margin-bottom: .625rem;

				font-size: .625rem;
				font-weight: 400;
			}

			.sub-options {
				display: flex;
				flex-wrap: wrap;
				gap: 1.25rem;

				.sub-option-card {
					display: flex;
					align-items: center;
					gap: .625rem;

					span {
						display: inline-flex;
						width: 2rem;
						height: 2rem;
						flex-shrink: 0;
						border-radius: 50%;
						border: .5px solid #B4B4B4;
						align-items: center;
						justify-content: center;
					}
				}
			}
		}

		/* Overlay mode paysage mobile */
		.mobile-landscape-overlay {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(0, 0, 0, 0.9);
			backdrop-filter: blur(10px);
			z-index: 10000;
		
			/* Afficher sur mobile tactile en mode paysage - dimensions étendues pour smartphones modernes */
			@media (max-width: 1024px) and (orientation: landscape) and (max-height: 700px) and (pointer: coarse) {
				display: flex;
				align-items: center;
				justify-content: center;
			}
		
			/* Fallback étendu pour navigateurs sans support pointer: coarse */
			@media (max-width: 896px) and (orientation: landscape) and (max-height: 414px) {
				display: flex;
				align-items: center;
				justify-content: center;
			}
		
			/* Fallback strict pour très petits écrans */
			@media (max-width: 480px) and (orientation: landscape) and (max-height: 400px) {
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		.landscape-message {
			text-align: center;
			color: white;
			padding: 2rem;
			max-width: 18.75rem;
			animation: fadeInScale 0.3s ease-out;
		}

		.rotate-icon {
			font-size: 3rem;
			margin-bottom: 1rem;
			animation: rotateDevice 2s ease-in-out infinite;
			display: block;
		}

		.landscape-message h3 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 1rem 0;
			color: #ffffff;
		}

		.landscape-message p {
			font-size: 0.875rem;
			line-height: 1.5;
			margin: 0;
			color: rgba(255, 255, 255, 0.8);
		}

}

/*
   Les animations du configurateur.

   Elles étaient déclarées à l'intérieur de la règle `.configurateur-layout`.
   Un `@keyframes` imbriqué dans une règle de style n'est pas du CSS valide :
   le minificateur les remontait silencieusement, jusqu'à ce qu'une version
   plus stricte refuse de construire. Leur place est ici, au niveau supérieur —
   un nom d'animation est de toute façon global.
*/

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeInScale {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes rotateDevice {
		0%, 100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-15deg);
		}
		75% {
			transform: rotate(15deg);
		}
	}
</style>
