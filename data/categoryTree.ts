
import { CategoryNode } from '../types';

export const categoryData: CategoryNode = {
  name: "Obchod",
  children: [
    {
      name: "Potraviny",
      children: [
        {
          name: "Těstoviny",
          children: [
            { name: "Dlouhé", children: [{ name: "Spaghetti" }, { name: "Tagliatelle" }, { name: "Fetuccine" }, { name: "Lasagne" }] },
            { name: "Krátké", children: [{ name: "Penne" }, { name: "Fusilli" }, { name: "Farfalle" }, { name: "Macaroni" }] },
            { name: "Plněné", children: [{ name: "Ravioli" }, { name: "Tortellini" }] },
            { name: "Polévkové", children: [{ name: "Zvířátkové těstoviny" }, { name: "Písmenkové" }, { name: "Nudle" }] }
          ]
        },
        {
          name: "Rýže",
          children: [
            { name: "Dlouhozrnná", children: [{ name: "Jasmínová" }, { name: "Basmati" }] },
            { name: "Střednězrnná", children: [{ name: "Paella rýže" }] },
            { name: "Kulatozrnná", children: [{ name: "Arborio" }, { name: "Carnaroli" }, { name: "Sushi rýže" }] }
          ]
        },
        {
          name: "Ořechy",
          children: [
            { name: "Arašídy", children: [{ name: "Arašíd neloupaný" }, { name: "Arašíd loupaný" }] },
            { name: "Mandle", children: [{ name: "Mandle neloupané" }, { name: "Mandle loupané" }] },
            { name: "Lískový ořech" }, { name: "Pekanový ořech" }, { name: "Pistácie" }, { name: "Kešu" }, { name: "Para ořechy" }, { name: "Vlašské ořechy" }, { name: "Kokos" }
          ]
        },
        {
          name: "Snídaně",
          children: [
            { name: "Přísady do mléka", children: [{ name: "Kukuřičné lupínky" }, { name: "Čokoládové donuty" }, { name: "Müsli" }] },
            { name: "Celozrnné vločky", children: [{ name: "Ovesné vločky" }, { name: "Špaldové vločky" }, { name: "Žitné vločky" }] },
            { name: "Ostatní", children: [{ name: "Tapioka" }, { name: "Chia semínka" }] }
          ]
        },
        {
          name: "Koření",
          children: [
            { name: "Sůl", children: [{ name: "Himalájská sůl" }, { name: "Mořská sůl" }, { name: "Kamenná sůl" }] },
            {
              name: "Ostré koření",
              children: [
                { name: "Pepř", children: [{ name: "Černý pepř" }, { name: "Bílý pepř" }, { name: "Červený pepř" }, { name: "Zelený pepř" }, { name: "Sečuánský pepř" }] },
                { name: "Chilli", children: [{ name: "Jalapeño" }, { name: "Habanero" }, { name: "Carolina Reaper" }, { name: "Kayenský pepř" }] }
              ]
            },
            {
              name: "Jemné koření",
              children: [
                { name: "Paprika", children: [{ name: "Sladká paprika" }, { name: "Pálivá paprika" }, { name: "Uzená paprika" }, { name: "Lahůdková paprika" }] },
                { name: "Koriandr" }, { name: "Kurkuma" }
              ]
            },
            {
              name: "Aromatické koření",
              children: [
                { name: "Kardamon" }, { name: "Skořice" }, { name: "Hřebíček" }, { name: "Fenykl" },
                { name: "Kmín", children: [{ name: "Kmín český" }, { name: "Římský kmín" }, { name: "Anýz" }, { name: "Fenykl" }] },
                { name: "Badyán" }, { name: "Vanilka" }, { name: "Nové koření" }
              ]
            },
            { name: "Bylinky", children: [{ name: "Majoránka" }, { name: "Bobkový list" }, { name: "Tymián" }, { name: "Oregáno" }, { name: "Bazalka" }, { name: "Estragon" }, { name: "Petržel" }, { name: "Citronová tráva" }] },
            { name: "Sušená zelenina", children: [{ name: "Sušená cibule" }, { name: "Sušený česnek" }, { name: "Sušený zázvor" }] },
            { name: "Květy a poupata", children: [{ name: "Hřebíček" }, { name: "Kapary" }, { name: "Šafrán" }, { name: "Muškátový květ" }] },
            { name: "Semínka", children: [{ name: "Slunečnicové semínko" }, { name: "Lněné semínko" }, { name: "Černý sezam" }, { name: "Bílý sezam" }] }

          ]
        },
        {
          name: "Ovoce a zelenina",
          children: [
            {
              name: "Ovoce",
              children: [
                { name: "Čerstvé", children: [{ name: "České", children: [{ name: "Jablka" }, { name: "Švestky" }, { name: "Třešně" }, { name: "Hrušky" }, { name: "Meruňky" }] }, { name: "Tropické", children: [{ name: "Pomeranče" }, { name: "Mandarinky" }, { name: "Kiwi" }, { name: "Mango" }, { name: "Papája" }, { name: "Ostatní" }] }] },
                { name: "Sušené", children: [{ name: "Mango sušené" }, { name: "Datle sušené" }, { name: "Křížaly" }] }
              ]
            },
            {
              name: "Zelenina",
              children: [
                { name: "Kořenová zelenina", children: [{ name: "Mrkev" }, { name: "Petržel" }, { name: "Celer" }, { name: "Ředkvička" }, { name: "Křen" }, { name: "Pastinák" }] },
                { name: "Košťálová zelenina", children: [{ name: "Zelí", children: [{ name: "Červené zelí" }, { name: "Bílé zelí" }] }, { name: "Kapusta" }, { name: "Květák" }, { name: "Brokolice" }, { name: "Kedlubna" }, { name: "Růžičková kapusta" }] },
                { name: "Listová zelenina", children: [{ name: "Hlávkový salát" }, { name: "Špenát" }, { name: "Mangold" }, { name: "Rukola" }, { name: "Polníček" }] },
                { name: "Cibulová zelenina", children: [{ name: "Cibule", children: [{ name: "Červená cibule" }, { name: "Bílá cibule" }, { name: "Šalotka" }] }, { name: "Česnek" }, { name: "Pór" }, { name: "Pažitka" }] },
                { name: "Plodová zelenina", children: [{ name: "Rajčata" }, { name: "Okurky" }, { name: "Papriky" }, { name: "Cukety" }, { name: "Melouny", children: [{ name: "Vodní meloun" }, { name: "Žlutý meloun" }] }] },
                { name: "Lusková zelenina", children: [{ name: "Fazole", children: [{ name: "Bílé" }, { name: "Červené" }, { name: "Mungo" }, { name: "Zelené" }] }, { name: "Hrách" }, { name: "Čočka" }, { name: "Sójové boby" }] }, { name: "Ostatní" }
              ]
            }
          ]
        }
      ]
    },
    {
      name: "Nápoje",
      children: [
        {
          name: "Nealkoholické nápoje",
          children: [
            { name: "Káva", children: [{ name: "Arabika" }, { name: "Robusta" }, { name: "Liberica" }, { name: "Excelsa" }] },
            { name: "Čaj", children: [{ name: "Černý čaj" }, { name: "Bílý čaj" }, { name: "Zelený čaj" }, { name: "Rooibos" }] },
            { name: "Voda", children: [{ name: "Neperlivá voda" }, { name: "Perlivá voda" }, { name: "Jemně perlivá voda" }] },
            { name: "Limonády" }, { name: "Kakao" },
            { name: "Mléčné nápoje", children: [{ name: "Mléko kravské" }, { name: "Mléko ovesné" }, { name: "Mléko mandlové" }, { name: "Mléko sojové" }] }
          ]
        },
        {
          name: "Alkoholické nápoje",
          children: [
            { name: "Pivo", children: [{ name: "Světlé pivo" }, { name: "Řezané pivo" }, { name: "Tmavé pivo" }, { name: "Pivní speciály" }] },
            { name: "Víno", children: [{ name: "Červené víno" }, { name: "Bílé víno" }, { name: "Růžové víno" }, { name: "Šumivé víno" }] },
            {
              name: "Lihoviny",
              children: [
                { name: "Destiláty" }, { name: "Likéry" }, { name: "Rum" }, { name: "Vodka" },
                { name: "Whiskey", children: [{ name: "Irská whiskey" }, { name: "Skotská whiskey" }, { name: "Bourbon" }] },
                { name: "Gin" }, { name: "Brandy" }, { name: "Ostatní" }
              ]
            }
          ]
        }
      ]
    }
  ]
};
