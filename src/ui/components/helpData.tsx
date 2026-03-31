// Ce fichier centralise tout le contenu d'aide de l'application.
// Il est organisé par page (clé = identifiant de page) puis par profil utilisateur.
// Les profils disponibles sont : 'admin', 'owner', 'delegate', 'member', 'guest', 'anonymous'
// Le profil 'all' s'affiche pour tous les utilisateurs (sections communes).
// profilePriority définit l'ordre de priorité : seul le profil le plus prioritaire
// parmi ceux de l'utilisateur est utilisé pour afficher les sections spécifiques.

import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type UserProfile = 'owner' | 'delegate' | 'member' | 'guest' | 'anonymous' | 'admin' ;

export const profilePriority: UserProfile[] = 
  ['admin', 'owner', 'delegate', 'member', 'guest', 'anonymous'];

export interface HelpSection {
  icon?: string;
  title: string;
  content: string | React.ReactNode;
}

export interface HelpContent {
  sections: HelpSection[];
}

// ── Contenu d'aide ─────────────────────────────────────────────────────────

export const helpContent: Record<string, Partial<Record<UserProfile | 'all', HelpContent>>> = {


// ── Choirs  ──────────────────────────────────────────────────────────────────


  'my-choirs': {
    all: { sections: [
        { icon: 'fa-people-group', title: 'Mes chorales',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cette page liste toutes les chorales auxquelles vous avez accès. </p>
              <p style={{ margin:'0', }}>Cliquez sur une chorale pour consulter les événements qui la constituent, ainsi que les chants qui leur sont liés.</p>
            </>), }, 
      ], },

    owner: { sections: [
        { icon: 'fa-circle-plus', title: 'Créer une chorale',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Si vous en avez encore la possibilité, un bouton "Créer une chorale" vous permet de créer une nouvelle chorale dont vous serez le 'propriétaire'. </p>
              <p style={{ margin:'0', }}>Vous aurez la possibilité de déléguer la création d'évènements.</p>
            </> ), },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque chorale a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre (et accéder à ses différents évènements). </p>
              <p style={{ margin:'0', }}>Il est également possible de donner accès à un évènement en particulier, en partageant le code associé à cet évènement...</p>
        </> ), },
        { icon: 'fa-trash', title: 'Supprimer une chorale',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cliquez sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} /> pour supprimer une chorale. </p>
              <p style={{ margin:'0', }}>Cette action supprimera également l'ensemble des évènements et chants associés, et est irréversible.</p>
            </> ), },
        { icon: 'fa-right-from-bracket',
          title: 'Quitter une chorale',
          content: (<>
            Si vous avez rejoint une autre chorale, cliquez sur l'icône <i className="fa fa-right-from-bracket" style={{ color: '#666666' }} /> pour la quitter. <br />
          </> ), },
      ], },

    delegate: { sections: [
        { icon: 'fa-user-check', title: 'Délégation',
          content: "Vous avez reçu délégation sur certaines chorales, ce qui vous permet de créer et d'administrer des événements.",
        },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque chorale a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre (et accéder à ses différents évènements). </p>
              <p style={{ margin:'0', }}>Il est également possible de donner accès à un évènement en particulier, en partageant le code associé à cet évènement...</p>
        </> ), },
        { icon: 'fa-right-from-bracket',
        title: 'Quitter une chorale',
        content: (<>
          Cliquez sur l'icône <i className="fa fa-right-from-bracket" style={{ color: '#666666' }} /> pour quitter une chorale que vous avez rejointe. <br />
        </> ), },
      ],},

    member: { sections: [
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque chorale a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre (et accéder à ses différents évènements). </p>
              <p style={{ margin:'0', }}>Il est également possible de donner accès à un évènement en particulier, en partageant le code associé à cet évènement...</p>
        </> ), },
        { icon: 'fa-right-from-bracket',
        title: 'Quitter une chorale',
        content: (<>
              Cliquez sur l'icône <i className="fa fa-right-from-bracket" style={{ color: '#666666' }} /> pour quitter une chorale que vous avez rejointe. 
        </> ), },
      ],},
  },


  'choir': {
    owner: { sections: [
        { icon: 'fa-users', title: 'Page de la chorale',
          content: "Cette page présente les chants et événements d'une chorale que vous avez créée. Utilisez les onglets pour naviguer entre ces différents éléments."
        },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque chorale a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre (et accéder à ses différents évènements). </p>
              <p style={{ margin:'0', }}>Il est également possible de donner accès à un évènement en particulier, en partageant le code associé à cet évènement...</p>
        </> ), },
        { icon: 'fa-music', title: 'Onglet \'Chants\'',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cet onglet liste les chants que vous avez créés ou importés ; ils peuvent être triés par ordre alphabétique ou par hashtags. </p>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Vous pouvez les classer en cliquant sur les icônes <i className="fa fa-music" style={{ color: '#666666' }} /> (par exemple pour les chants classiques)
              et <i className="fa fa-heart" style={{ color: '#666666' }} /> (par exemple pour ceux que vous appréciez particulièrement).
              Des filtres permettent de prendre en compte ces classements... </p>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>A côté de chaque chant, un compteur de vues est visible. </p>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Vous pouvez supprimer un chant en cliquant sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} />. </p>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}><i className="fa fa-music" style={{ color: '#DA486D' }} /> Vous avez la possibilité d'ajouter un nouveau chant en cliquant sur le premier bouton en bas de la liste.  </p>
              <p style={{ margin:'0', }}><i className="fa fa-folder-open" style={{ color: '#DA486D' }} /> Vous avez également la possibilité d'importer plusieurs chants simultanément en cliquant sur le second bouton en bas de la liste.</p>
            </> ), },
        { icon: 'fa-calendar-days', title: 'Onglet \'Evénements\'',
        content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cet onglet liste les évenements rattachés à la chorale (créés par vous-même ou par tout utilisateur ayant reçu délégation de votre part). </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent le rejoindre. </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cliquez sur l'icône <i className="fa fa-calendar-days" style={{ color: '#666666' }} /> pour activer ou désactiver un évènement. Un événement inactif est invisible pour les autres utilisateurs...</p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>A côté de chaque évènement, un compteur de vues est visible. </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Vous pouvez supprimer un évènement en cliquant sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} />. </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Vous pouvez télécharger les partitions d'un (et d'un seul) évènement pour pouvoir les consulter sans réseau, en cliquant sur l'icône <i className="fa fa-download" style={{ color: '#666666' }} />.
            Vous serez redirigé vers une autre page qui vous permettra de réellement déclencher le téléchargement. </p>
            <p style={{ margin:'0', }}><i className="fa fa-calendar-days" style={{ color: '#DA486D' }} /> Vous avez la possibilité d'ajouter un nouvel évènement en cliquant sur le bouton en bas de la liste. </p>
          </> ), },
        { icon: 'fa-user-check', title: 'Donner délégation',
          content: "En tant que 'propriétaire' de cette chorale, vous avez la possibilité de 'Donner délégation' à un autre utilisateur, qui pourra créer et gérer des événements en votre nom.",
        },
        { icon: 'fa-trash', title: 'Supprimer la chorale',
          content: "Vous pouvez 'supprimer la chorale' ; cette action supprimera également l'ensemble des évènements et chants associés, et est irréversible.",
        },
      ], },

    delegate: { sections: [
        { icon: 'fa-users', title: 'Page de la chorale',
          content: "Cette page présente les chants et événements d'une chorale pour laquelle vous avez reçu délégation. Utilisez les onglets pour naviguer entre ces différents éléments."
        },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque chorale a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre (et accéder à ses différents évènements). </p>
              <p style={{ margin:'0', }}>Il est également possible de donner accès à un évènement en particulier, en partageant le code associé à cet évènement...</p>
        </> ), },
        { icon: 'fa-music', title: 'Onglet \'Chants\'',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cet onglet liste les chants paramétrés par le 'propriétaire' de la chorale ; ils peuvent être triés par ordre alphabétique ou par hashtags. </p>
              <p style={{ margin:'0', }}>Le cas échéant, un classement réalisé par le 'propriétaire' de la chorale est restitué par des indicateurs visuels : 
              <i className="fa fa-music" style={{ color: '#666666' }} /> (par exemple pour les chants classiques) 
              et <i className="fa fa-heart" style={{ color: '#666666' }} /> (par exemple pour ceux qu'il apprécie particulièrement). 
              Des filtres permettent de prendre en compte ces éventuels classements...</p>
            </> ), },
        { icon: 'fa-calendar-days', title: 'Onglet \'Evénements\'',
        content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cet onglet liste les évenements rattachés à la chorale (créés par le 'propriétaire' de la chorale, vous-même ou tout utilisateur ayant reçu délégation). </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent le rejoindre. </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cliquez sur l'icône <i className="fa fa-calendar-days" style={{ color: '#666666' }} /> pour activer ou désactiver un évènement que vous avez créé. 
            Un événement inactif n'est visible que de vous et du 'propriétaire' de la chorale...</p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Vous pouvez supprimer un évènement que vous avez créé en cliquant sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} />. </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Vous pouvez télécharger les partitions d'un (et d'un seul) évènement pour pouvoir les consulter sans réseau, en cliquant sur l'icône <i className="fa fa-download" style={{ color: '#666666' }} />.
            Vous serez redirigé vers une autre page qui vous permettra de réellement déclencher le téléchargement. </p>
            <p style={{ margin:'0', }}><i className="fa fa-calendar-days" style={{ color: '#DA486D' }} /> Vous avez la possibilité d'ajouter un nouvel évènement en cliquant sur le bouton en bas de la liste. </p>
          </> ), },
        { icon: 'fa-right-from-bracket', title: 'Quitter la chorale',
          content: "Vous pouvez 'quitter la chorale' ; les évènements que vous avez créés resteront visibles, et devront être administrés par le 'propriétaire' de la chorale.",
        },
      ], },

    member: { sections: [
        { icon: 'fa-users', title: 'Page de la chorale',
          content: "Cette page présente les événements de la chorale que vous avez rejointe."
        },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque chorale a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre (et accéder à ses différents évènements). </p>
              <p style={{ margin:'0', }}>Il est également possible de donner accès à un évènement en particulier, en partageant le code associé à cet évènement...</p>
        </> ), },
        { icon: 'fa-calendar-days', title: 'Liste des \'Evénements\'',
        content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent le rejoindre. </p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Certains événements peuvent avoir été inactivés par leurs organisateurs, et apparaissent alors grisés. </p>
            <p style={{ margin:'0', }}>Vous pouvez télécharger les partitions d'un (et d'un seul) évènement pour pouvoir les consulter sans réseau, en cliquant sur l'icône <i className="fa fa-download" style={{ color: '#666666' }} />.
            Vous serez redirigé vers une autre page qui vous permettra de réellement déclencher le téléchargement. </p>
          </> ), },
        { icon: 'fa-right-from-bracket', title: 'Quitter la chorale',
          content: "Vous pouvez 'quitter la chorale' en cliquant sur le bouton en bas de l'écran.",
        },
      ], },
    
      guest: { sections: [
        { icon: 'fa-users', title: 'Page de la chorale',
          content: "Cette page présente l'ensemble des événements que vous avez rejoints pour cette chorale."
        },
        { icon: 'fa-calendar-days', title: 'Liste des \'Evénements\'',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent le rejoindre. </p>
            <p style={{ margin:'0', }}>Vous pouvez quitter un évènement en cliquant sur l'icône <i className="fa fa-right-from-bracket" style={{ color: '#666666' }} />. </p>
          </> ), },
        { icon: 'fa-download', title: 'Téléchargement',
        content: (<>
          Vous pouvez télécharger les partitions d'un (et d'un seul) évènement pour pouvoir les consulter sans réseau, en cliquant sur l'icône <i className="fa fa-download" style={{ color: '#666666' }} />.
          Vous serez redirigé vers une autre page qui vous permettra de réellement déclencher le téléchargement.
        </> ), },
      ], },
  },

  
  'choir-creation': {
    owner: { sections: [
        { icon: 'fa-users', title: 'Créer une chorale',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de créer une nouvelle chorale dont vous serez le 'propriétaire'.</p>
            <p style={{ margin:'0' }}>Un code unique sera automatiquement attribué à votre chorale. Vous pourrez le partager avec vos choristes pour qu'ils puissent la rejoindre.</p>
          </>), },
      ], },
  },


  'choir-delegation': {
    owner: { sections: [
        { icon: 'fa-user-check', title: 'Donner délégation',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de donner délégation à un autre utilisateur pour qu'il puisse créer et gérer des événements pour votre chorale.</p>
            <p style={{ margin:'0' }}>Saisissez son adresse email et un mot de passe pour lui accorder la délégation. Si cet utilisateur n'en a pas encore, un compte sera créé pour lui avec le mot de passe renseigné. </p>
          </>), },
        { icon: 'fa-circle-info', title: 'Droits du délégué',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Un délégué peut créer, modifier et supprimer les événements qu'il a créés.</p>
            <p style={{ margin:'0' }}>Il ne peut pas modifier les chants, supprimer la chorale, ni donner délégation à d'autres utilisateurs.</p>
          </>), },
        { icon: 'fa-trash', title: 'Supprimer une délégation',
          content: (<>
            Vous pouvez supprimer une délégation en cliquant sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} /> en face de l'utilisateur concerné. 
          </>), },          
      ], },
  },  


  'choir-delete': {
    owner: { sections: [
        { icon: 'fa-trash', title: 'Supprimer une chorale',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de supprimer définitivement une chorale. Cette action est irréversible.</p>
            <p style={{ margin:'0' }}> Tous les événements et tous les chants associés seront également supprimés.</p>
          </>), },
      ], },
  },


  'choir-join': {
    all: { sections: [
        { icon: 'fa-circle-plus', title: 'Rejoindre une chorale',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de rejoindre une chorale en saisissant son code.</p>
            <p style={{ margin:'0' }}>Le code, composé de 8 chiffres, peut vous être fourni par l'organisateur ou par un membre de la chorale.</p>
          </>), },
      ], },
  },


  'choir-leave': {
    member: { sections: [
        { icon: 'fa-right-from-bracket', title: 'Quitter une chorale',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de quitter une chorale que vous avez rejointe.</p>
            <p style={{ margin:'0' }}>Si nécessaire, vous pourrez la rejoindre à nouveau ultérieurement en réutilisant son code. </p>
          </>), },
      ], },

    delegate: { sections: [
        { icon: 'fa-right-from-bracket', title: 'Quitter une chorale',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Vous avez la possibilité de quitter cette chorale pour laquelle vous avez reçu délégation.</p>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Les événements que vous avez créés resteront visibles et devront être administrés par le 'propriétaire' de la chorale.</p>
            <p style={{ margin:'0' }}>Si nécessaire, vous pourrez la rejoindre à nouveau ultérieurement en réutilisant son code. </p>
          </>), },
      ], },
  },


// ── Events  ──────────────────────────────────────────────────────────────────


  'event': {
    owner: { sections: [
        { icon: 'fa-calendar-days', title: 'Page de l\'événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cette page présente les chants associés à un événement que vous avez créé ou dont vous êtes 'propriétaire'.</p>
            <p style={{ margin:'0', }}>Cliquez sur un chant pour accéder à ses éventuels partitions et fichiers audio. </p>
          </>), },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: "Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre.",
        },
        { icon: 'fa-file-pdf', title: 'Livret PDF',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Le bouton "Télécharger le livret PDF" génère un livret avec une page de garde et toutes les partitions PDF des chants de l'événement.</p>
            <p style={{ margin:'0', }}>Si vous avez préalablement téléchargé les partitions sur votre terminal, vous pourrez générer le livret sans réseau. </p>
          </>), },
        { icon: 'fa-pencil', title: 'Modifier / Supprimer',
          content: "Vous pouvez modifier ou supprimer définitivement l'évènement, en cliquant sur l'un des deux boutons en bas de page.",
        },
      ], },

    delegate: { sections: [
        { icon: 'fa-calendar-days', title: 'Page de l\'événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cette page présente les chants associés à un événement que vous avez créé.</p>
            <p style={{ margin:'0', }}>Cliquez sur un chant pour accéder à ses éventuels partitions et fichiers audio. </p>
          </>), },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: "Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre.",
        },
        { icon: 'fa-file-pdf', title: 'Livret PDF',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Le bouton "Télécharger le livret PDF" génère un livret avec une page de garde et toutes les partitions PDF des chants de l'événement.</p>
            <p style={{ margin:'0', }}>Si vous avez préalablement téléchargé les partitions sur votre terminal, vous pourrez générer le livret sans réseau. </p>
          </>), },
        { icon: 'fa-pencil', title: 'Modifier / Supprimer',
          content: "Vous pouvez modifier ou supprimer définitivement l'évènement, en cliquant sur l'un des deux boutons en bas de page.",
        },
      ], },

    member: { sections: [
        { icon: 'fa-calendar-days', title: 'Page de l\'événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cette page présente les chants associés à un événement d'une chorale que vous avez rejointe.</p>
            <p style={{ margin:'0', }}>Cliquez sur un chant pour accéder à ses éventuels partitions et fichiers audio. </p>
          </>), },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: "Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre.",
        },
        { icon: 'fa-file-pdf', title: 'Livret PDF',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Le bouton "Télécharger le livret PDF" génère un livret avec une page de garde et toutes les partitions PDF des chants de l'événement.</p>
            <p style={{ margin:'0', }}>Si vous avez préalablement téléchargé les partitions sur votre terminal, vous pourrez générer le livret sans réseau. </p>
          </>), },
      ], },

    guest: { sections: [
        { icon: 'fa-calendar-days', title: 'Page de l\'événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cette page présente les chants associés à un événement que vous avez rejoint.</p>
            <p style={{ margin:'0', }}>Cliquez sur un chant pour accéder à ses éventuels partitions et fichiers audio. </p>
          </>), },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: "Chaque évènement a un code unique, qui peut être partagé avec les choristes pour qu'ils puissent la rejoindre.",
        },
        { icon: 'fa-file-pdf', title: 'Livret PDF',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Le bouton "Télécharger le livret PDF" génère un livret avec une page de garde et toutes les partitions PDF des chants de l'événement.</p>
            <p style={{ margin:'0', }}>Si vous avez préalablement téléchargé les partitions sur votre terminal, vous pourrez générer le livret sans réseau. </p>
          </>), },
        { icon: 'fa-right-from-bracket', title: 'Quitter l\'évènement',
          content: "Vous pouvez \'quitter l\'évènement\' en cliquant sur le bouton en bas de page.",
        },
      ], },
  },  


  'event-delete': {
    owner: { sections: [
        { icon: 'fa-trash', title: 'Supprimer un événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de supprimer définitivement un événement (créé par vous-même ou par tout utilisateur ayant reçu délégation de votre part). Cette action est irréversible.</p>
            <p style={{ margin:'0' }}>Les associations avec les chants seront supprimées, mais les chants eux-mêmes resteront dans la chorale.</p>
          </>), },
      ], },

    delegate: { sections: [
        { icon: 'fa-trash', title: 'Supprimer un événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de supprimer définitivement un événement que vous avez créé. Cette action est irréversible.</p>
            <p style={{ margin:'0' }}>Les associations avec les chants seront supprimées, mais les chants eux-mêmes resteront dans la chorale.</p>
          </>), },
      ], },
  },  


  'event-edit': {
    all: { sections: [
        { icon: 'fa-calendar-days', title: 'Créer / Modifier un événement',
          content: 'Cette page vous permet de créer un nouvel événement ou de modifier un événement existant.',
        },
        { icon: 'fa-music', title: 'Chants associés',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Sélectionnez les chants à associer à cet événement depuis la liste des chants associés à la chorale. Utilisez les deux onglets ou le champ de recherche pour vous y aider... </p>
            <p style={{ margin:'0' }}>L'ordre des chants peut ensuite être modifié en utilisant les flèches <i className="fa fa-caret-up" style={{ color: '#666666' }} /> et <i className="fa fa-caret-down" style={{ color: '#666666' }} />.</p>
          </>),
        },
        { icon: 'fa-share-nodes', title: 'Partager le code',
          content: 'Une fois l\'événement créé, un code unique lui est attribué. Vous pouvez le partager avec les choristes pour qu\'ils puissent rejoindre l\'événement.',
        },
      ], },
  },  


  'event-leave': {
    guest: { sections: [
        { icon: 'fa-sign-out', title: 'Quitter un événement',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de quitter un événement que vous avez rejoint directement via son code.</p>
            <p style={{ margin:'0' }}>Vous pourrez le rejoindre à nouveau ultérieurement en utilisant le même code.</p>
          </>), },
      ], },
  },


  'my-events': {
    all: { sections: [
        { icon: 'fa-calendar-days', title: 'Mes événements',
          content: "Cette page liste tous les événements auxquels vous avez accès. Cliquez sur un événement pour consulter ses chants.",
        },
      ], },
      
    owner: { sections: [
        { icon: 'fa-calendar-days', title: 'Activer / Désactiver',
          content: (<>
            Cliquez sur l'icône <i className="fa fa-calendar-days" style={{ color: '#666666' }} /> pour activer ou désactiver un évènement. Un événement inactif est invisible pour les autres utilisateurs...
          </>), },
        { icon: 'fa-trash', title: 'Supprimer un évènement',
        content: (<>
          Cliquez sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} /> pour supprimer un évènement (créé par vous-même ou par tout utilisateur ayant reçu délégation de votre part).
        </>), },
        { icon: 'fa-download', title: 'Mémoriser pour hors ligne',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cliquez sur l'icône <i className="fa fa-download" style={{ color: '#666' }} /> pour mémoriser les partitions d'un événement pour une utilisation sans réseau (un seul événement peut être mémorisé à la fois).</p>
            <p style={{ margin:'0' }}>L'icône devient bleue <i className="fa fa-download" style={{ color: '#044C8D' }} /> quand les fichiers sont disponibles hors ligne. Vous pouvez alors supprimer les fichiers mémorisés en cliquant à nouveau sur l'icône.</p>
          </>), },
      ], },

    delegate: { sections: [
        { icon: 'fa-calendar-days', title: 'Activer / Désactiver',
          content: (<>
            Cliquez sur l'icône <i className="fa fa-calendar-days" style={{ color: '#666666' }} /> pour activer ou désactiver un évènement que vous avez créé. Un événement inactif n'est visible que de vous et du 'propriétaire' de la chorale...
          </>), },
        { icon: 'fa-trash', title: 'Supprimer un évènement',
        content: (<>
          Cliquez sur l'icône <i className="fa fa-trash" style={{ color: '#666666' }} /> pour supprimer un évènement que vous avez créé.
        </>), },
        { icon: 'fa-download', title: 'Mémoriser pour hors ligne',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cliquez sur l'icône <i className="fa fa-download" style={{ color: '#666' }} /> pour mémoriser les partitions d'un événement pour une utilisation sans réseau (un seul événement peut être mémorisé à la fois).</p>
            <p style={{ margin:'0' }}>L'icône devient bleue <i className="fa fa-download" style={{ color: '#044C8D' }} /> quand les fichiers sont disponibles hors ligne. Vous pouvez alors supprimer les fichiers mémorisés en cliquant à nouveau sur l'icône.</p>
          </>), },
      ], },

    member: { sections: [
        { icon: 'fa-download', title: 'Mémoriser pour hors ligne',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cliquez sur l'icône <i className="fa fa-download" style={{ color: '#666' }} /> pour mémoriser les partitions d'un événement pour une utilisation sans réseau (un seul événement peut être mémorisé à la fois).</p>
            <p style={{ margin:'0' }}>L'icône devient bleue <i className="fa fa-download" style={{ color: '#044C8D' }} /> quand les fichiers sont disponibles hors ligne. Vous pouvez alors supprimer les fichiers mémorisés en cliquant à nouveau sur l'icône.</p>
          </>), },
      ], },

    guest: { sections: [
        { icon: 'fa-download', title: 'Mémoriser pour hors ligne',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cliquez sur l'icône <i className="fa fa-download" style={{ color: '#666' }} /> pour mémoriser les partitions d'un événement pour une utilisation sans réseau (un seul événement peut être mémorisé à la fois).</p>
            <p style={{ margin:'0' }}>L'icône devient bleue <i className="fa fa-download" style={{ color: '#044C8D' }} /> quand les fichiers sont disponibles hors ligne. Vous pouvez alors supprimer les fichiers mémorisés en cliquant à nouveau sur l'icône.</p>
          </>), },
        { icon: 'fa-sign-out', title: 'Quitter un événement',
          content: (<>
            Cliquez sur l'icône <i className="fa fa-sign-out" style={{ color: '#666' }} /> pour quitter un événement que vous avez rejoint.
          </>), },
      ], },
  },


// ── Songs  ──────────────────────────────────────────────────────────────────


  'song': {
      all: { sections: [
        { icon: 'fa-music', title: 'Page du chant',
          content: (<>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}>Cette page présente les fichiers associés à un chant&nbsp;: fichiers PDF (partitions) et fichiers audio.</p>
              <p style={{ marginTop:'0', marginBottom:'0.4rem', }}><i className="fa fa-file-pdf" style={{ color: '#666666' }} /> Cliquez sur un fichier PDF pour l'ouvrir en plein écran&nbsp;; vous aurez la possibilité de sélectionner et de lire un fichier audio en cliquant sur l'icône à droite de la barre du haut.</p>
              <p style={{ margin:'0', }}><i className="fa fa-play" style={{ color: '#666666' }} /> Cliquez sur un fichier audio pour l'écouter&nbsp;; vous aurez également la possibilité d'ouvrir un fichier PDF.</p>
            </>), }, 
        { icon: 'fa-download', title: 'Téléchargement',
          content: (<>
            Pour les chants d'un évènement qui a fait l'objet d'un téléchargement (pour une consultation hors ligne), cliquez sur l'icône <i className="fa fa-download" style={{ color: '#666666' }} /> pour ajouter ou supprimer un fichier du téléchargement.
          </>), }, 
        { icon: 'fa-hand-pointer', title: 'Navigation',
          content: "Vous pouvez naviguer d'un chant à l'autre en utilisant les flèches, ou en 'swipant' à gauche ou à droite.",
        },
      ], },

    owner: { sections: [
        { icon: 'fa-hashtag', title: 'Hashtags',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Vous pouvez ajouter des hashtags à ce chant pour faciliter sa recherche et son classement.</p>
            <p style={{ margin:'0' }}>Pour un meilleur classement des chants, vous pouvez également utiliser les deux icônes (par exemple <i className="fa fa-music" style={{ color: '#666' }} /> pour les chants les plus connus, et <i className="fa fa-heart" style={{ color: '#666' }} /> pour ceux que vous appréciez particulièrement).</p>
          </>), },
        { icon: 'fa-upload', title: 'Ajouter un fichier',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Vous pouvez ajouter des fichiers PDF ou audio à ce chant via le formulaire en bas de page.</p>
            <p style={{ margin:'0' }}>Cliquez sur l'icône <i className="fa fa-trash" style={{ color: '#666' }} /> pour supprimer un fichier.</p>
          </>), },
        { icon: 'fa-pencil', title: 'Modifier / Supprimer',
          content: "Vous pouvez modifier ou supprimer définitivement le chant, en cliquant sur l'un des deux boutons en bas de page.",
        },
      ], },
  },  
  

  'song-edit': {
    owner: { sections: [
        { icon: 'fa-music', title: 'Ajouter / modifier un chant',
          content: 'Cette page vous permet d\'ajouter ou de modifier un chant.',
        },
        { icon: 'fa-hashtag', title: 'Hashtags',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Les hashtags permettent de classer et de retrouver facilement les chants.</p>
            <p style={{ margin:'0' }}>Saisissez un hashtag et appuyez sur 'Entrée' ou 'Espace' pour l'ajouter. Des suggestions s'affichent automatiquement à partir des hashtags déjà utilisés dans la chorale.</p>
          </>), },
      ], },
  },


  'songs-import': {
    owner: { sections: [
        { icon: 'fa-folder-open', title: 'Importer des chants',
          content: (<>
            Cette page vous permet d'importer plusieurs chants en une seule opération&nbsp;: glissez-déposez un ou plusieurs répertoires dans la zone prévue à cet effet. 
          </>), },
        { icon: 'fa-folder', title: 'Structure des répertoires',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Chaque répertoire doit contenir uniquement des fichiers PDF ou audio (mp3, wav, ogg, m4a), sans sous-répertoire.</p>
            <p style={{ margin:'0' }}>Pour chaque répertoire, un chant sera créé avec comme titre le nom du répertoire, et comme fichiers joints le contenu du répertoire (fichiers PDF et fichiers audio).</p>
          </>), },
        { icon: 'fa-circle-info', title: 'Rapport d\'import',
          content: 'Après l\'import, un rapport détaille pour chaque chant les fichiers attachés, ignorés ou en erreur.',
        },
      ], },
  },  


  'song-delete': {
    owner: { sections: [
        { icon: 'fa-trash', title: 'Supprimer un chant',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page vous permet de supprimer définitivement un chant et tous ses fichiers associés. Cette action est irréversible.</p>
            <p style={{ margin:'0' }}>Les fichiers PDF et audio associés seront également supprimés.</p>
          </>), },
      ], },
  },  


// ── Autres  ──────────────────────────────────────────────────────────────────


'login': {
    all: { sections: [
        { icon: 'fa-right-to-bracket', title: 'Se connecter',
          content: "Il n'est pas nécessaire de se connecter pour utiliser cette application. Seuls ceux qui administrent les chorales ont besoin de se connecter.",
        },
        { icon: 'fa-circle-plus', title: 'Rejoindre une chorale',
          content: "Vous pouvez rejoindre une chorale depuis la page d'accueil, ou depuis le menu en haut à gauche.",
        },
      ], },
  },  


  'create-user': {
    all: { sections: [
        { icon: 'fa-user-plus', title: 'Ajouter un utilisateur',
          content: (<>
            <p style={{ marginTop:'0', marginBottom:'0.4rem' }}>Cette page, accessible uniquement aux admin, permet de créer un nouvel utilisateur.</p>
            <p style={{ margin:'0' }}>Le nouvel utilisateur aura la possibilité de créer une chorale, mais n'aura pas le droit d'admin.</p>
          </>), },
      ], },
  },  


};