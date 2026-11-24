/* Colonias de la CDMX (selección de las más buscadas, por alcaldía) */
window.COLONIAS_CDMX = [
  // Cuauhtémoc
  'Roma Norte','Roma Sur','Condesa','Hipódromo','Hipódromo Condesa','Juárez','Cuauhtémoc','Centro Histórico','Doctores','Obrera','Narvarte','San Rafael','Santa María la Ribera','Tabacalera','Escandón','Guerrero','Buenavista','Peralvillo',
  // Benito Juárez
  'Narvarte Poniente','Narvarte Oriente','Del Valle Centro','Del Valle Norte','Del Valle Sur','Nápoles','Insurgentes Mixcoac','Mixcoac','San Pedro de los Pinos','Álamos','Portales Norte','Portales Sur','Letrán Valle','Santa Cruz Atoyac','Xoco','General Anaya','Moderna','Niños Héroes de Chapultepec','Albert','Ciudad de los Deportes','Noche Buena','Americas Unidas',
  // Miguel Hidalgo
  'Polanco','Polanco Chapultepec','Anzures','Lomas de Chapultepec','Lomas de Reforma','Granada','Ampliación Granada','Irrigación','Escandón I Sección','Escandón II Sección','Tacubaya','Anáhuac','Verónica Anzures','San Miguel Chapultepec','Daniel Garza','América','Observatorio','Pensil',
  // Álvaro Obregón
  'Santa Fe','Lomas de Santa Fe','San Ángel','San Ángel Inn','Florida','Guadalupe Inn','Chimalistac','Tizapán','Jardines del Pedregal','Las Águilas','Alcantarilla','Olivar de los Padres','Tlacopac','Merced Gómez',
  // Coyoacán
  'Coyoacán','Del Carmen','Santa Catarina','Villa Coyoacán','Pedregal de Santo Domingo','Copilco','Ciudad Jardín','Churubusco','Country Club Churubusco','Parque San Andrés','Santo Domingo','Los Reyes','Pueblo de los Reyes','Educación',
  // Iztacalco / Iztapalapa / Venustiano Carranza
  'Agrícola Oriental','Granjas México','Gabriel Ramos Millán','Pantitlán','Santa Anita','Iztacalco','Jardín Balbuena','Moctezuma','Aeropuerto','Merced Balbuena','Escuadrón 201','Juan Escutia','Sinatel','Paseos de Churubusco',
  // Gustavo A. Madero / Azcapotzalco
  'Lindavista','Vallejo','Industrial','Gustavo A. Madero','San Bartolo Atepehuacan','Zacatenco','Nueva Vallejo','Clavería','Azcapotzalco','Ángel Zimbrón','Del Gas','Nueva Santa María','San Álvaro','Popotla',
  // Tlalpan / Xochimilco / Cuajimalpa / Magdalena Contreras
  'Tlalpan Centro','Fuentes del Pedregal','Villa Olímpica','Héroes de Padierna','Jardines en la Montaña','Isidro Fabela','Toriello Guerra','Pedregal de San Nicolás','Cuajimalpa','Bosques de las Lomas','Interlomas','Contadero','Lomas de Vista Hermosa','Jardines del Pedregal de San Ángel','Magdalena Contreras','San Jerónimo Lídice','Xochimilco','Nativitas','Barrio San Lorenzo',
  // Otros
  'Lomas Verdes','Lomas Altas','Reforma Social','Palmitas','Torres de Mixcoac','Insurgentes San Borja','San Borja','Colonia del Valle','Colonia Roma','Roma','Mixcoac','Parque Delta','Ex Hipódromo de Peralvillo','Tlatelolco','Nonoalco Tlatelolco','Santa María Insurgentes','Zona Rosa','Nueva Anzures','Lomas Hermosas'
].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a.localeCompare(b, 'es'));
