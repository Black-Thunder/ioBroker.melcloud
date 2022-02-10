# MELCloud - Benutzerhandbuch

## Voraussetzungen

Um diesen Adapter korrekt verwenden zu können, müssen folgende Vorbereitungen getroffen werden:

* Mitsubishi-Gerät mit Wi-Fi-Adapter
* MELCloud-Account unter der [offiziellen Website](https://app.melcloud.com/) angelegt
* Gerät wurde im Account registriert und vollständig eingerichtet

## Konfiguration

![Einstellungen des Adapters](img/adapter_settings.png)

An dieser Stelle kann die jeweilige Adapter-Instanz konfiguriert werden. Zwingend nötig für die Funktionalität sind die Zugangsdaten (E-Mail-Adresse und Passwort) des MELCloud-Accounts. Zusätzlich kann die Region des Accounts angegeben werden.

Zusätzlich wird hier das Intervall (in Minuten) angegeben, wie oft Daten von der MELCloud abgerufen und gespeichert werden sollen. Das kleinstmögliche Intervall ist eine Minute. Sollte es während des Betriebs des Adapters zu Verbindungsproblemen mit der MELCloud (z.B. Serverausfall, Internetabbruch) kommen, so wird höchstens noch dreimal versucht, eine Verbindung herzustellen. Sollte dies dann auch nicht gelingen, so wird der nächste Versuch erst in einer Stunde stattfinden.

## Objekte

Nachdem die Adapter-Instanz (X) erfolgreich (=grün) gestartet wurde, werden die Geräte inklusive Daten aus der MELCloud abgerufen. Für jedes Gerät (Y) wird ein separater Objekt-Knoten angelegt.

### melcoud.X.info

| ID | lesbar | änderbar | Bemerkung |
|--- | :---: | :---: |--- |
| connection | X | - | Gibt den Verbindungsstatus zur MELCloud an |

### Luft-Luft-Wärmepumpen (Klimageräte)
#### melcloud.X.device.Y.info

| ID | lesbar | änderbar | Bemerkung |
|--- | :---: | :---: |--- |
| actualFanSpeed | X | - | Tatsächliche Lüfterstufe im Automatikmodus |
| buildingId | X | - | Zugeordnete Gebäude-ID |
| canCool | X | - | Fähigkeit zu kühlen |
| canHeat | X | - | Fähigkeit zu heizen |
| canDry | X | - | Fähigkeit zu entfeuchten |
| deviceName | X | - | Name des Geräts |
| deviceOnline | X | - | Gibt an, ob das Gerät erreichbar ist |
| floorId | X | - | Zugeordnete Etagen-ID |
| lastCommunication | X | - | Zeitstempel der letzten Kommunikation (MELCloud -> Gerät) |
| minTempCoolDry | X | - | Minimale Temperatur (Kühlen/Entfeuchten) |
| maxTempCoolDry | X | - | Maximale Temperatur (Kühlen/Entfeuchten) |
| minTempHeat | X | - | Minimale Temperatur (Heizen) |
| maxTempHeat | X | - | Maximale Temperatur (Heizen) |
| minTempAuto | X | - | Minimale Temperatur (Automatik) |
| maxTempAuto | X | - | Maximale Temperatur (Automatik) |
| macAddress | X | - | MAC-Adresse des Geräts |
| nextCommunication | X | - | Zeitstempel der nächsten Kommunikation (MELCloud -> Gerät) |
| numberOfFanSpeeds | X | - | Anzahl der verfügbaren Lüfterstufen |
| roomTemp | X | - | Aktuelle Raumtemperatur |
| serialNumber | X | - | Seriennummer des Geräts |

#### melcloud.X.device.Y.control

| ID | lesbar | änderbar | Bemerkung |
|--- | :---: | :---: |--- |
| fanSpeed | X | X | Aktuelle Lüfterstufe des Geräts (0=Automatik, 1...'numberOfFanSpeeds'= minimale bis maximale Stufe) |
| mode | X | X | Betriebsmodus des Geräts (1=Heizen, 2=Entfeuchten, 3=Kühlen, 7=Lüften, 8=Automatik) |
| power | X | X | Hauptschalter (schaltet Gerät ein bzw. aus) |
| targetTemp | X | X | Zieltemperatur des Geräts |
| vaneHorizontalDirection | X | X | Aktuelle horizontale Ausrichtung des Luftauslasses (0=Automatik, 1...5=ganz links bis ganz rechts, 8=50/50 (nur bei Geräten mit 2 getrennten Luftauslässen), 12=Swing) |
| vaneVerticalDirection | X | X | Aktuelle vertikale Ausrichtung des Luftauslasses (0=Automatik, 1...5=ganz oben bis ganz unten, 7=Swing) |

#### melcloud.X.device.Y.reports

Um Berichte abrufen zu können, müssen zunächst Start- ("startDate") und Endzeitpunkt ("endDate") korrekt festgelegt werden. Dabei ist das Format JJJJ-MM-TT zu beachten! Zur eigentlichen Durchführung des Abrufs muss der Datenpunkt "getPowerConsumptionReport" getriggert werden.
Kurz darauf werden die entsprechenden Datenpunkte mit den Werten aus der Cloud befüllt.

| ID | lesbar | änderbar | Bemerkung |
|--- | :---: | :---: |--- |
| startDate | X | X | Beginn des Abrufzeitraums der Berichte (Format: JJJJ-MM-TT, z.B. 2020-05-31) |
| endDate | X | X | Ende des Abrufzeitraums der Berichte (Format: JJJJ-MM-TT, z.B. 2021-01-08) |
| getPowerConsumptionReport | - | X | Schalter, um das Abrufen der Berichte anzustoßen |
| reportedMonths | X | - | Array aller Monate, die abgerufen wurden (1 = Januar, ..., 12 = Dezember) |
| totalMinutes | X | - | Zeitraum des gemessenen Verbrauchs (in Minuten) |
| totalPowerConsumption*Betriebsmodus* | X | - | Gesamtverbrauch im Modus *Betriebsmodus* (in kWh) - wird für jeden Betriebsmodus angelegt |
| totalPowerConsumption*Betriebsmodus* *Monat* | X | - | Gesamtverbrauch im Modus *Betriebsmodus* und im jeweiligen *Monat* (in kWh) - wird für jeden Betriebsmodus und Monat angelegt |

### Luft-Wasser-Wärmepumpen -- Adapter-Version 1.2.0 oder höher erforderlich
#### melcloud.X.device.Y.info

| ID | lesbar | änderbar | Bemerkung |
|--- | :---: | :---: |--- |
| buildingId | X | - | Zugeordnete Gebäude-ID |
| canCool | X | - | Fähigkeit zu kühlen |
| canHeat | X | - | Fähigkeit zu heizen |
| condensingTemperature | X | - | Kondensationstemperatur 
| deviceName | X | - | Name des Geräts |
| deviceOnline | X | - | Gibt an, ob das Gerät erreichbar ist |
| floorId | X | - | Zugeordnete Etagen-ID |
| flowTemperature | X | - | Vorlauftemperatur 
| flowTemperatureBoiler | X | - | Vorlauftemperatur des Boilers
| flowTemperatureZone1 | X | - | Vorlauftemperatur Zone 1 
| flowTemperatureZone2 | X | - | Vorlauftemperatur Zone 2 (falls vorhanden)
| hasZone2 | X | - | Flag, ob das Gerät einen zweiten Kreislauf hat |
| lastCommunication | X | - | Zeitstempel der letzten Kommunikation (MELCloud -> Gerät) |
| macAddress | X | - | MAC-Adresse des Geräts |
| mixingTankWaterTemperature | X | - | Temperatur des Mischwassertanks
| nextCommunication | X | - | Zeitstempel der nächsten Kommunikation (MELCloud -> Gerät) |
| outdoorTemperature | X | - | Außentemperatur 
| returnTemperature | X | - | Rücklauftemperatur 
| returnTemperatureBoiler | X | - | Rücklauftemperatur des Boilers
| returnTemperatureZone2 | X | - | Rücklauftemperatur Zone 1 
| returnTemperature | X | - | Rücklauftemperatur Zone 2 (falls vorhanden)
| roomTemperatureZone1 | X | - | Raumtemperatur des ersten Kreislaufs
| roomTemperatureZone2 | X | - | Raumtemperatur des zweiten Kreislaufs (falls vorhanden)
| serialNumber | X | - | Seriennummer des Geräts |
| tankWaterTemperature | X | - | Temperatur des Wasserspeichers

#### melcloud.X.device.Y.control

| ID | lesbar | änderbar | Bemerkung |
|--- | :---: | :---: |--- |
| forcedHotWaterMode | X | X | Betriebsmodus Warmwasser (false=Automatisch, true=WW-Vorrang) |
| operationModeZone1 | X | X | Betriebsmodus des ersten Kreislaufs (0=HEATTHERMOSTAT, 1=HEATFLOW, 2=CURVE, 3=COOLTHERMOSTAT, 4=COOLFLOW) |
| operationModeZone2 | X | X | Betriebsmodus des zweiten Kreislaufs, falls vorhanden (0=HEATTHERMOSTAT, 1=HEATFLOW, 2=CURVE, 3=COOLTHERMOSTAT, 4=COOLFLOW) |
| power | X | X | Hauptschalter (schaltet Gerät ein bzw. aus) |
| setTemperatureZone1 | X | X | Zieltemperatur des ersten Kreislaufs |
| setTemperatureZone2 | X | X | Zieltemperatur des zweiten Kreislaufs (falls vorhanden) |