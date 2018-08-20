import { Injectable } from '@angular/core';
import { Content } from '../../shared/models/content.model';
import { PieData } from './playlist-viz.component';

import { LocalStorageService } from 'ngx-localstorage';

export const MAX_VALUE = 10000;
const STORAGE_CONTENTS_KEY = 'data';

@Injectable()
export class PlaylistVizService {
    constructor(private localStorage: LocalStorageService) { }

    /** Compute playlist wrapper
     * @param contents given contents to compute playlist
     * @returns pie charts data to display
     */
    public compute(contents: Content[]): PieData {
        const playlist: Content[] = this.bubbleCalculator(contents);
        const pieData: any = this.computePieData(playlist);
        this.store(contents);
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

    /**
    * Save content into Local storage
    */
    public store(contents: Content[]): void {
        const stringifiedData = JSON.stringify(contents);
        this.localStorage.set(STORAGE_CONTENTS_KEY, stringifiedData);
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
        const content: Content = Object.assign(playlist.find((c: Content) => c.name === key));
        content.saturation = value;
        newContents.push(content);
    });

    return newContents;
}
