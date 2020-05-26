# MELCloud - Benutzerhandbuch

## Voraussetzungen

Um diesen Adapter korrekt verwenden zu können, müssen folgende Vorbereitungen getroffen werden:

* Mitsubishi Klimaanlage mit einem Wi-Fi-Adapter MAC-567IF (pro zu steuerndem Gerät einer nötig)
* MELCloud-Account unter der [offiziellen Website](https://app.melcloud.com/) angelegt
* Alle Klimageräte wurden im Account registriert und vollständig eingerichtet

## Konfiguration

![Einstellungen des Adapters](img/adapter_settings.png)

An dieser Stelle kann die jeweilige Adapter-Instanz konfiguriert werden. Zwingedn nötig für die Funktionalität sind die Zugangsdaten (E-Mail-Adresse und Passwort) des MELCloud-Accounts. Zusätzlich kann die Region des Accounts angegeben werden.
Zusätzlich wird hier das Intervall (in Minuten) angegeben, wie oft Daten von der MELCloud abgerufen und gespeichert werden sollen. Das kleinstmögliche Intervall ist eine Minute.

## Objekte

Nachdem die Adpater-INstanz (X) erfolgreich (=grün) gestartet wurde, werden die Geräte inklusive Daten aus der MELCloud abgerufen. Für jedes Gerät (Y) wird ein separater Objekt-Knoten angelegt.

### melcoud.X.info

| id | read | write | comment |
|--- |--- |--- |--- |
| connection | X | - | Gibt den Verbindungsstatus zur MELCloud an |

### melcloud.X.device.Y.info

| id | read | write | comment |
|--- |--- |--- |--- |
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

### melcloud.X.device.Y.control

| id | read | write | comment |
|--- |--- |--- |--- |
| fanSpeed | X | X | Aktuelle Lüfterstufe des Geräts (0=Automatik, 1...'numberOfFanSpeeds'= minimale bis maximale Stufe) |
| mode | X | X | Betriebsmodus des Geräts (1=Heizen, 2=Entfeuchten, 3=Kühlen, 7=Lüften, 8=Automatik) |
| power | X | X | Hauptschalter (schaltet Gerät ein bzw. aus) |
| targetTemp | X | X | Zieltemperatur des Geräts |
| vaneHorizontalDirection | X | X | Aktuelle hoizontale Ausrichtung des Luftauslasses (0=Automatik, 1...5=minimal bis maximal, 12=Swing) |
| vaneVerticalDirection | X | X | Aktuelle vertikale Ausrichtung des Luftauslasses (0=Automatik, 1...5=minimal bis maximal, 12=Swing) |