import { Injectable } from '@angular/core';

import { Content } from '../../shared/models/content.model';
import { PieData, ForceMapData, Link } from './playlist-viz.models';

import { LocalStorageService } from 'ngx-localstorage';

export const MAX_VALUE = 10000;
const STORAGE_CONTENTS_KEY = 'data';
const SEPERATION_CONTENTS_KEY = 'seperation';

interface OptimDebugStep {
    playlist: Content[];
    remainder: Content[][];
    iteration: number;
}

@Injectable()
export class PlaylistVizService {
    private optimDebug: OptimDebugStep[] = [];

    public isSeperate = false;
    public isSelfSeperate = false;

    constructor(private localStorage: LocalStorageService) { }

    /** Compute playlist wrapper
     * @param contents given contents to compute playlist
     * @returns pie charts data to display
     */
    public compute(contents: Content[]): PieData {
        const playlist: Content[] = this.optimSortCalculator(contents);
        const pieData: any = this.computePieData(playlist);
        return (pieData || []);
    }

    /**
     * Extract data for Pie Chart from playlist assignment
     * @param playlist given content playlist
     */
    private computePieData(playlist: Content[]): PieData {
        const colors: string[] = [];
        const data: { name: string, value: number }[] = [];

        const contentMap: Map<string, number> = new Map();

        playlist.forEach((content: Content) => {
            if (contentMap.has(content.name)) {
                const aggr = contentMap.get(content.name) + 1;
                contentMap.delete(content.name);
                contentMap.set(content.name, aggr);
            } else {
                contentMap.set(content.name, 0);
            }

            colors.push(content.color);
            data.push({
                name: content.name + '-' + contentMap.get(content.name).toString(),
                value: content.duration
            });
        });

        return { colors: colors, data: data };
    }

    /**
     * Extract data for saturation force map from content configuration
     * @param contents given content list
     */
    public computeForceMap(contents: Content[]): ForceMapData {
        const colors: string[] = [];
        const data: { value: string }[] = [];
        const links: Link[] = [];

        contents.forEach((c: Content) => {
            data.push({ value: c.name });
            colors.push(c.color);
        });

        contents.forEach((c: Content) => {
            c.separation.forEach((s: string) => {
                if (!links.some((l: Link) => (c.name === l.source && s === l.target) || (c.name === l.target && s === l.source))) {
                    links.push({ source: c.name, target: s });
                }
            });
        });

        return { colors: colors, data: data, links: links };
    }

    /**
     * Compute standard deviation for a content
     * @param target given content to compute SD
     * @param _playlist given content asignment to compute SD
     * @param best given average distance as reference for SD
     * @returns computed SD for content
     */
    private computestandardDeviationForContent(target: Content, _playlist: Content[], best: number): number {
        let standardDeviation = 0;
        let cpt = 0;
        const nbAffectation = target.saturation;
        const playlist: Content[] = [..._playlist];

        let firstAffectationIndex = playlist.indexOf(target);
        const lastAffectationIndex = playlist.lastIndexOf(target);
        let nextAffectationIndex = playlist.indexOf(target, firstAffectationIndex + 1);

        // If 2 or more affectations, start by computing distance of the loop
        if (nbAffectation >= 1) {
            playlist.slice(lastAffectationIndex + 1, playlist.length)
                .forEach((c: Content) => cpt += c.duration);

            playlist.slice(0, firstAffectationIndex)
                .forEach((c: Content) => cpt += c.duration);

            standardDeviation += Math.abs(best - cpt);
            cpt = 0;
        }

        while (nextAffectationIndex !== -1 && firstAffectationIndex !== nextAffectationIndex) {
            playlist.slice(firstAffectationIndex + 1, nextAffectationIndex)
                .forEach((c: Content) => cpt += c.duration);

            standardDeviation += Math.abs(best - cpt);
            cpt = 0;

            playlist.splice(firstAffectationIndex, nextAffectationIndex - firstAffectationIndex);
            firstAffectationIndex = playlist.indexOf(target);
            nextAffectationIndex = playlist.indexOf(target, firstAffectationIndex + 1);
        }

        return standardDeviation / nbAffectation;
    }

    /**
     * Compute (best) average distance between two affectations of the same content
     * @param target @type Content: given content
     * @param contents @type Content[]: given content list
     * @returns computed best theoric distance for content
     */
    private computeAverageDistanceForContent(target: Content, contents: Content[]): number {
        let dc = 0;
        contents.forEach((c: Content) => dc += target.name === c.name ? 0 : c.duration * c.saturation);
        return dc / target.saturation;
    }

    /**
     * Compute playlist from contents by Insert-Evaluate-Decide algorithm
     * @param contents Content[]: given content list
     * @param threshold given number of retry before exit
     * @returns computed playlist
    */
    public optimSortCalculator(contents: Content[], threshold?: number): Content[] {
        this.optimDebug = []; // Reset Debug
        let tryThreshold: number = (threshold || 30);

        // Create initial content pool of every content, saturation wise
        let contentPool: Content[] = [];
        contents.forEach((c: Content) => {
            Array.from(Array(c.saturation).keys()).forEach((val: number) => contentPool.push(c));
        });

        // Shuffle content pool
        contentPool = shuffle(shuffle(shuffle(shuffle(shuffle(shuffle(contentPool))))));
        // contentPool = contentPool;

        /*  seperationRemainder[0] self seperation
            seperationRemainder[1] ext seperation
            seperationRemainder[2] both
        */
        let seperationRemainder: Content[][] = [[], [], []];
        const playlist: Content[] = [];
        let maxRating = MAX_VALUE;

        do {
            // FOR-EACH: Content in content pool
            contentPool.forEach((content: Content) => {
                let playlistTemp = [];
                let bestPivot: Content = null;
                let bestPivotIndex: number = null;
                let seperationStatus = 0;

                // FOR-EACH: Pivot in affected playlist
                playlist.forEach((pivot: Content, index: number) => {
                    playlistTemp = [...playlist];

                    seperationStatus = this.checkSeperation(content, index, playlist);

                    // IF: No seperation constraint viloation
                    if (seperationStatus === 0) {
                        playlistTemp.splice(index, 0, content);

                        const contentsTemp = contentsFromPlaylist(playlistTemp);
                        const rating = this.ratePlaylist(contentsTemp, playlistTemp);

                        if (rating < maxRating) {
                            bestPivot = pivot;
                            bestPivotIndex = index + 1;
                            maxRating = rating;
                        }
                        // ELSE: Seperation constraint violation
                    } else if (index === playlist.length - 1) {

                    }
                });

                if (bestPivot && bestPivotIndex !== null) {
                    playlist.splice(bestPivotIndex, 0, content);
                } else {
                    switch (seperationStatus) {
                        case 0:
                            playlist.push(content);
                            break;

                        case 1:
                            seperationRemainder[0].push(content);
                            break;
                        case 2:
                            seperationRemainder[1].push(content);
                            break;

                        case 3:
                            seperationRemainder[2].push(content);
                            break;
                    }
                }

                maxRating = MAX_VALUE;
                bestPivotIndex = null;
                bestPivot = null;
                seperationStatus = 0;
            });

            // Refill content pool with remainder from previous iteration
            tryThreshold--;
            this.optimDebug[0] = { playlist: playlist, remainder: seperationRemainder, iteration: ((threshold || 100) - tryThreshold) };
            contentPool = [...seperationRemainder[1], ...seperationRemainder[2], ...seperationRemainder[0]];
            seperationRemainder = [[], [], []];
        } while (tryThreshold && contentPool.length);

        return playlist;
    }

    /** Check seperation of content for insert in playlist
     * @param content given content to check
     * @param index given index to insert in playlist
     * @param playlist given playlist in which we insert
     * @returns '1' self-seperation | '2' seperation | '3' both | 0 no seperation issue
     */
    private checkSeperation(content: Content, index: number, playlist: Content[]): number {
        let result = 0;

        if (this.isSelfSeperate || this.isSeperate) {
            const neighbors: string[] = [
                playlist[index].name,
                index + 1 >= playlist.length ? playlist[0].name : playlist[index + 1].name
            ];

            if (this.isSeperate) {
                if ((neighbors[0] !== content.name) && (content.separation.indexOf(neighbors[0]) > -1) ||
                    (neighbors[1] !== content.name) && (content.separation.indexOf(neighbors[1]) > -1)) {
                    result += 2;
                }
            }

            if (this.isSelfSeperate) {
                if (content.name === neighbors[0] || content.name === neighbors[1]) {
                    result += 1;
                }
            }
        }

        return result;
    }

    /**
     * Compute playlist rating from standard deviation
     * @param contents @type Content[]: given content list
     * @param playlist @type Content[]: given playlist
     * @returns computed playlist rating based on standard deviation
     */
    private ratePlaylist(contents: Content[], playlist: Content[]): number {
        let rating = 0;

        contents.forEach((content: Content) => {
            const best = this.computeAverageDistanceForContent(content, contents);
            const standardDeviation = this.computestandardDeviationForContent(content, playlist, best);
            rating += standardDeviation;
        });

        return rating;
    }

    private manageSeperation(playlist: Content[]): boolean {
        return false;
    }

    /** Change seperation mode
     */
    public changeSeperationMode(type: 'auto' | 'ext', value: boolean): void {
        if (type === 'auto') {
            this.isSelfSeperate = value;
        }

        if (type === 'ext') {
            this.isSeperate = value;
        }

        const stringifiedData = JSON.stringify({
            auto: this.isSelfSeperate,
            ext: this.isSeperate
        });

        this.localStorage.set(SEPERATION_CONTENTS_KEY, stringifiedData);
    }

    /**
     * Get contents to restore from Local storage
    */
    public restore(): Content[] {
        let data: Content[];
        try {
            const storedData = this.localStorage.get(STORAGE_CONTENTS_KEY);
            data = JSON.parse(storedData);
        } finally {
            return data ? data : [];
        }
    }

    public seperationRestore(): { auto: boolean, ext: boolean } {
        let data: { auto: boolean, ext: boolean };
        try {
            const storedData = this.localStorage.get(SEPERATION_CONTENTS_KEY);
            data = JSON.parse(storedData);
        } finally {
            return data ? data : { auto: false, ext: false };
        }
    }

    /**
    * Save content into Local storage
    */
    public store(contents: Content[]): void {
        const stringifiedData = JSON.stringify(contents);
        this.localStorage.set(STORAGE_CONTENTS_KEY, stringifiedData);
    }

    /**
     * Compute playlist from contents by insert strategy algorithm
     * @param _contents @type Content[]: given content list
     * @returns computed playlist
    */
    private simpleCalculator(contents: Content[]): Content[] {
        const ordererContents: Content[] = contents.sort((c1: Content, c2: Content) => {
            return c1.saturation < c2.saturation ? 1 : -1;
        });

        contents = [...ordererContents];

        let size = 0;

        contents.forEach((content: Content) => size += content.saturation);

        const finalList: Content[] = [];

        contents.forEach((content: Content, i: number) => {
            const pas: number = Math.round(size / content.saturation);

            let firstIndex: number = null;
            let newFirstIndex: number = null;
            let newIndexToInsert: number = null;

            let reste: number = null;
            let indice: number = null;

            Array.from(Array(content.saturation).keys()).forEach((s: number) => {
                let j = 0;
                let indexR: number = null;
                let indexL: number = null;

                let index = s * pas;

                if (firstIndex !== null) {
                    index = s * pas + firstIndex;
                }

                if (i >= size) {
                    const lastIndex = getLastIndex(contents[i], finalList);
                    reste = size - lastIndex;
                    newFirstIndex = pas - reste + 1;

                    newIndexToInsert = newFirstIndex + pas * indice;
                    indice++;

                    finalList[newIndexToInsert] = contents[i];
                    removeLastNull(finalList);

                    return;
                }

                // parcourir la liste vers la droite
                for (j = index; j < size; j++) {
                    if (finalList[j] == null) {
                        indexR = j;
                        break;
                    }
                }
                // parcourir la liste vers la gauche
                for (j = index; j < size && j >= 0; j--) {
                    if (finalList[j] == null) {
                        indexL = j;
                        break;
                    }
                }

                if (indexL == null) {
                    finalList[indexR] = contents[i];
                    if (s === 0) {
                        firstIndex = indexR;
                    }
                } else if (indexR == null) {
                    finalList[indexL] = contents[i];
                    if (s === 0) {
                        firstIndex = indexL;
                    }
                } else if (Math.abs(indexR - index) <= Math.abs(indexL - index)) {
                    finalList[indexR] = contents[i];
                    if (s === 0) {
                        firstIndex = indexR;
                    }
                } else {
                    finalList[indexL] = contents[i];
                    if (s === 0) {
                        firstIndex = indexL;
                    }
                }
            });
        });

        return finalList;
    }

    /**
     * Compute playlist from contents by Insert-Evaluate-Decide algorithm
     * @param _contents @type Content[]: given content list
     * @returns computed playlist
     */
    private bubbleCalculator(_contents: Content[]): Content[] {
        const playlist: Content[] = [];

        const ordererContents: Content[] = _contents.sort((c1: Content, c2: Content) => {
            return c1.saturation > c2.saturation ? 1 : -1;
        });

        ordererContents.forEach((content: Content) => {
            let maxRating = MAX_VALUE;

            Array.from(Array(content.saturation).keys()).forEach((s: number) => {
                let playlistTemp = [];
                let bestPivot: Content = null;
                let bestPivotIndex: number = null;

                playlist.forEach((pivot: Content, index: number) => {
                    /** Check seperation */

                    playlistTemp = [...playlist];
                    playlistTemp.splice(index, 0, content);

                    const contentsTemp = contentsFromPlaylist(playlistTemp);
                    const rating = this.ratePlaylist(contentsTemp, playlistTemp);

                    if (rating < maxRating) {
                        bestPivot = pivot;
                        bestPivotIndex = index;
                        maxRating = rating;
                    }
                });

                if (bestPivot && bestPivotIndex !== null) {
                    playlist.splice(bestPivotIndex, 0, content);
                } else {
                    playlist.push(content);
                }

                maxRating = MAX_VALUE;
                bestPivotIndex = null;
                bestPivot = null;
            });
        });

        return playlist;
    }
}

/** UTILS */
export function getLastIndex(content: Content, contents: Content[]): number {
    return contents.lastIndexOf(content);
}

export function removeLastNull(contents: Content[]): void {
    contents.splice(contents.lastIndexOf(null), 1);
}


export function contentsFromPlaylist(playlist: Content[]): Content[] {
    const contentMap: Map<string, number> = new Map();

    playlist.forEach((content: Content) => {
        if (contentMap.has(content.name)) {
            const aggr = contentMap.get(content.name) + 1;
            contentMap.delete(content.name);
            contentMap.set(content.name, aggr);
        } else {
            contentMap.set(content.name, 1);
        }
    });

    const newContents: Content[] = [];
    contentMap.forEach((value: number, key: string) => {
        const content: Content = Object.assign({}, playlist.find((c: Content) => c.name === key));
        content.saturation = value;
        newContents.push(content);
    });

    return newContents;
}

export function shuffle(array: any[]): any[] {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        const index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        const temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}
