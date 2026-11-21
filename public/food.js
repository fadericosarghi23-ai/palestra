/* starfit+ — alimenti comuni con valori medi per 100 g (o 100 ml).
   Fonti indicative: tabelle CREA e USDA ed etichette tipiche. Sono stime: per un prodotto preciso usa l'etichetta
   e aggiungilo come alimento personalizzato.
   Formato: [nome, kcal, proteine, carboidrati, grassi, porzione in g, nome della porzione] */
window.FitFood = (function () {
  const CATS = {
    "Pane, pasta e cereali": [
      ["Pasta (cruda)", 353, 12.5, 72, 1.5, 80, "1 porzione"],
      ["Pasta integrale (cruda)", 340, 13.5, 64, 2.5, 80, "1 porzione"],
      ["Pasta (cotta)", 158, 5.8, 31, 0.9, 200, "1 piatto"],
      ["Riso (crudo)", 350, 7, 79, 0.6, 80, "1 porzione"],
      ["Riso (cotto)", 130, 2.7, 28, 0.3, 180, "1 piatto"],
      ["Pane comune", 270, 8.5, 55, 1.2, 50, "1 fetta"],
      ["Pane integrale", 245, 9, 46, 2.5, 50, "1 fetta"],
      ["Fette biscottate", 410, 11, 75, 6, 10, "1 fetta"],
      ["Gallette di riso", 380, 8, 81, 3, 9, "1 galletta"],
      ["Cracker", 430, 10, 70, 11, 25, "1 pacchetto"],
      ["Grissini", 410, 12, 68, 9, 20, "4 grissini"],
      ["Fiocchi d'avena", 370, 13, 60, 7, 50, "1 porzione"],
      ["Cornflakes", 375, 7, 84, 1, 30, "1 ciotola"],
      ["Muesli", 370, 10, 66, 6, 50, "1 ciotola"],
      ["Piadina", 330, 8, 50, 10, 120, "1 piadina"],
      ["Pizza margherita", 250, 10, 32, 9, 320, "1 pizza"],
      ["Pizza al taglio", 270, 10, 35, 10, 150, "1 trancio"],
      ["Gnocchi di patate", 150, 3.5, 32, 0.6, 200, "1 piatto"],
      ["Tortellini freschi", 300, 13, 45, 8, 125, "1 porzione"],
      ["Cous cous (cotto)", 112, 3.8, 23, 0.2, 180, "1 piatto"],
      ["Quinoa (cotta)", 120, 4.4, 21, 1.9, 150, "1 porzione"],
      ["Farro (cotto)", 130, 5, 26, 0.8, 150, "1 porzione"],
      ["Patate (lesse o al forno senza olio)", 85, 2, 19, 0.1, 200, "1 porzione"],
      ["Patatine fritte", 312, 3.4, 41, 15, 150, "1 porzione"]
    ],
    "Carne e pesce": [
      ["Petto di pollo (crudo)", 110, 23, 0, 1.2, 150, "1 porzione"],
      ["Petto di pollo (cotto)", 165, 31, 0, 3.6, 120, "1 porzione"],
      ["Petto di tacchino (crudo)", 107, 24, 0, 1, 150, "1 porzione"],
      ["Manzo magro (crudo)", 130, 21, 0, 5, 150, "1 bistecca"],
      ["Macinato di manzo (crudo)", 215, 18.5, 0, 15, 150, "1 porzione"],
      ["Hamburger di manzo (cotto)", 230, 19, 0, 17, 120, "1 hamburger"],
      ["Lonza di maiale (cruda)", 145, 21, 0, 6.6, 150, "1 porzione"],
      ["Salsiccia", 300, 15, 1, 26, 100, "1 salsiccia"],
      ["Bresaola", 151, 32, 0.4, 2.6, 50, "1 porzione"],
      ["Prosciutto crudo", 268, 25.5, 0, 18.5, 50, "1 porzione"],
      ["Prosciutto cotto", 180, 20, 1, 10, 50, "1 porzione"],
      ["Fesa di tacchino affettata", 105, 20, 1.5, 2, 50, "1 porzione"],
      ["Salame", 425, 25, 1, 35, 30, "5 fette"],
      ["Mortadella", 310, 15, 1, 28, 50, "1 porzione"],
      ["Tonno al naturale (sgocciolato)", 103, 24, 0, 0.7, 80, "1 scatoletta"],
      ["Tonno sott'olio (sgocciolato)", 192, 25, 0, 10, 80, "1 scatoletta"],
      ["Salmone fresco", 185, 20, 0, 12, 150, "1 trancio"],
      ["Salmone affumicato", 147, 25, 0, 4.5, 50, "1 porzione"],
      ["Merluzzo o nasello", 71, 17, 0, 0.3, 150, "1 filetto"],
      ["Orata o branzino", 100, 20, 0, 2.3, 200, "1 pesce"],
      ["Gamberi", 71, 13.6, 2.9, 0.6, 150, "1 porzione"],
      ["Bastoncini di pesce", 200, 12, 18, 9, 100, "4 bastoncini"]
    ],
    "Uova e latticini": [
      ["Uovo", 128, 12.4, 0, 8.7, 55, "1 uovo"],
      ["Albume", 45, 10.7, 0.7, 0.2, 33, "1 albume"],
      ["Latte parzialmente scremato", 46, 3.5, 5, 1.6, 250, "1 tazza"],
      ["Latte intero", 64, 3.3, 4.9, 3.6, 250, "1 tazza"],
      ["Latte senza lattosio (p.s.)", 45, 3.4, 4.8, 1.5, 250, "1 tazza"],
      ["Bevanda di soia", 39, 3, 2.5, 1.8, 250, "1 tazza"],
      ["Yogurt greco 0%", 57, 10, 4, 0, 170, "1 vasetto"],
      ["Yogurt greco intero", 93, 9, 3.8, 5, 150, "1 vasetto"],
      ["Yogurt bianco intero", 66, 3.8, 4.3, 3.9, 125, "1 vasetto"],
      ["Yogurt alla frutta", 95, 3.3, 15, 2.5, 125, "1 vasetto"],
      ["Skyr", 63, 11, 4, 0.2, 150, "1 vasetto"],
      ["Fiocchi di latte", 98, 11, 3.4, 4.3, 150, "1 confezione"],
      ["Ricotta", 146, 8.8, 3.5, 10.9, 100, "1 porzione"],
      ["Mozzarella", 253, 18.7, 0.7, 19.5, 125, "1 mozzarella"],
      ["Mozzarella light", 165, 20, 1, 9, 125, "1 mozzarella"],
      ["Parmigiano o grana", 390, 33, 0, 28, 20, "2 cucchiai grattugiato"],
      ["Formaggio spalmabile", 250, 6, 3, 24, 30, "1 porzione"],
      ["Burro", 758, 0.8, 1.1, 83.4, 10, "1 noce"],
      ["Proteine in polvere (whey)", 380, 78, 6, 6, 30, "1 misurino"]
    ],
    "Legumi": [
      ["Ceci (cotti o in scatola)", 120, 7, 17, 2.5, 120, "1 porzione"],
      ["Lenticchie (cotte)", 116, 9, 20, 0.4, 150, "1 porzione"],
      ["Fagioli (cotti o in scatola)", 100, 6.6, 15, 0.5, 120, "1 porzione"],
      ["Piselli", 75, 5.5, 11, 0.4, 100, "1 porzione"],
      ["Tofu", 120, 13, 1.5, 7, 100, "1 porzione"],
      ["Hummus", 240, 7, 14, 17, 50, "2 cucchiai"]
    ],
    "Frutta": [
      ["Banana", 89, 1.1, 23, 0.3, 120, "1 banana"],
      ["Mela", 52, 0.3, 14, 0.2, 180, "1 mela"],
      ["Pera", 57, 0.4, 15, 0.1, 170, "1 pera"],
      ["Arancia", 47, 0.9, 12, 0.1, 180, "1 arancia"],
      ["Mandarino", 53, 0.8, 13, 0.3, 80, "1 mandarino"],
      ["Kiwi", 61, 1.1, 15, 0.5, 75, "1 kiwi"],
      ["Fragole", 32, 0.7, 7.7, 0.3, 150, "1 ciotola"],
      ["Mirtilli", 57, 0.7, 14, 0.3, 100, "1 vaschetta"],
      ["Uva", 69, 0.7, 18, 0.2, 150, "1 grappolo"],
      ["Pesca", 39, 0.9, 10, 0.3, 150, "1 pesca"],
      ["Ananas", 50, 0.5, 13, 0.1, 150, "2 fette"],
      ["Datteri secchi", 282, 2.5, 75, 0.4, 30, "4 datteri"]
    ],
    "Verdura": [
      ["Insalata", 15, 1.4, 2.9, 0.2, 80, "1 ciotola"],
      ["Pomodori", 18, 0.9, 3.9, 0.2, 150, "1 porzione"],
      ["Zucchine", 17, 1.2, 3.1, 0.3, 200, "1 porzione"],
      ["Broccoli", 34, 2.8, 7, 0.4, 200, "1 porzione"],
      ["Spinaci", 23, 2.9, 3.6, 0.4, 200, "1 porzione"],
      ["Carote", 41, 0.9, 10, 0.2, 100, "1 porzione"],
      ["Peperoni", 26, 1, 6, 0.3, 150, "1 porzione"],
      ["Melanzane", 25, 1, 6, 0.2, 200, "1 porzione"],
      ["Finocchi", 31, 1.2, 7, 0.2, 200, "1 finocchio"],
      ["Funghi", 22, 3.1, 3.3, 0.3, 150, "1 porzione"],
      ["Passata di pomodoro", 30, 1.3, 5.5, 0.2, 100, "per 1 piatto di pasta"],
      ["Verdure miste surgelate", 45, 2.5, 7, 0.5, 200, "1 porzione"]
    ],
    "Condimenti e frutta secca": [
      ["Olio extravergine d'oliva", 884, 0, 0, 100, 10, "1 cucchiaio"],
      ["Mandorle", 603, 22, 4.6, 55.3, 30, "1 manciata"],
      ["Noci", 689, 14.3, 5.1, 68.1, 30, "1 manciata"],
      ["Arachidi tostate", 598, 29, 8.5, 50, 30, "1 manciata"],
      ["Burro d'arachidi", 588, 25, 20, 50, 20, "1 cucchiaio"],
      ["Avocado", 160, 2, 8.5, 14.7, 100, "mezzo avocado"],
      ["Pesto alla genovese", 450, 5, 6, 45, 30, "per 1 piatto di pasta"],
      ["Maionese", 680, 1, 1, 75, 15, "1 cucchiaio"],
      ["Ketchup", 100, 1.2, 24, 0.1, 15, "1 cucchiaio"]
    ],
    "Dolci e snack": [
      ["Cornetto", 410, 7, 45, 22, 60, "1 cornetto"],
      ["Biscotti frollini", 460, 7, 70, 17, 30, "3 biscotti"],
      ["Crema alla nocciola", 539, 6.3, 57.5, 30.9, 15, "1 cucchiaio"],
      ["Marmellata", 250, 0.5, 60, 0, 20, "1 cucchiaio"],
      ["Miele", 304, 0.3, 82, 0, 10, "1 cucchiaino"],
      ["Zucchero", 392, 0, 100, 0, 5, "1 cucchiaino"],
      ["Cioccolato fondente 70%", 580, 8, 33, 42, 20, "2 quadretti"],
      ["Cioccolato al latte", 545, 7, 57, 31, 20, "2 quadretti"],
      ["Gelato", 210, 4, 25, 10, 100, "1 coppetta"],
      ["Torta (fetta)", 400, 6, 50, 19, 80, "1 fetta"],
      ["Barretta proteica", 360, 30, 35, 12, 60, "1 barretta"],
      ["Barretta ai cereali", 400, 6, 70, 11, 25, "1 barretta"],
      ["Patatine in busta", 530, 6, 52, 33, 25, "1 sacchetto"]
    ],
    "Bevande": [
      ["Caffè espresso", 2, 0.1, 0, 0, 30, "1 tazzina"],
      ["Cappuccino", 46, 2.4, 3.7, 2.4, 150, "1 cappuccino"],
      ["Spremuta d'arancia", 45, 0.7, 10, 0.2, 200, "1 bicchiere"],
      ["Succo di frutta", 50, 0.3, 12, 0, 200, "1 brick"],
      ["Cola", 42, 0, 10.6, 0, 330, "1 lattina"],
      ["Bevanda isotonica", 25, 0, 6, 0, 500, "1 bottiglia"],
      ["Birra", 43, 0.5, 3.6, 0, 330, "1 bottiglia piccola"],
      ["Vino", 83, 0.1, 2.6, 0, 125, "1 bicchiere"]
    ],
    "Piatti pronti": [
      ["Pasta al pomodoro", 140, 4.5, 25, 3, 300, "1 piatto"],
      ["Pasta al ragù", 165, 7, 23, 5, 300, "1 piatto"],
      ["Pasta alla carbonara", 210, 9, 23, 9, 300, "1 piatto"],
      ["Risotto", 150, 3.5, 22, 5, 300, "1 piatto"],
      ["Lasagne", 160, 8, 15, 8, 300, "1 porzione"],
      ["Minestrone", 45, 2, 7, 1, 300, "1 piatto"],
      ["Panino con prosciutto", 260, 13, 33, 8, 150, "1 panino"],
      ["Toast prosciutto e formaggio", 290, 15, 28, 13, 120, "1 toast"],
      ["Hamburger del fast food (panino)", 255, 13, 28, 10, 200, "1 panino"],
      ["Kebab", 215, 12, 20, 10, 350, "1 kebab"],
      ["Sushi misto", 150, 6, 28, 1.5, 300, "10 pezzi"],
      ["Poke bowl al salmone", 150, 8, 18, 5, 400, "1 bowl"],
      ["Insalatona con tonno e uova", 120, 9, 4, 8, 350, "1 piatto"]
    ]
  };
  const FOODS = [];
  Object.keys(CATS).forEach(cat => CATS[cat].forEach(r => FOODS.push({
    id: r[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    n: r[0], k: r[1], p: r[2], c: r[3], f: r[4], g: r[5], u: r[6], cat
  })));
  return { FOODS, CATS: Object.keys(CATS) };
})();
